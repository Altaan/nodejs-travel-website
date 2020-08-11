const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");

const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Email = require("../utils/email");

// Generating JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Sending JWT as cookie to the client
const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  res.cookie("jwt", token, {
    // The browser will delete the cookie after it has expired
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    // The cookie won't be accessed or modified by the browser and it will be sent automatically with every req
    httpOnly: true,
    // The cookie will only be sent with HTTPS during production
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
  });

  // Remove the password from the res
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    // token, // used for testing in postman
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  const url = `${req.protocol}://${req.get("host")}/me`;

  // send welcome email (Email service not activated)
  await new Email(newUser, url).sendWelcome();

  // Generate a JWT for the new user and send it with the res
  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // check if email and password were sent in the req
  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  // adding + before selecting password is needed coz password field has select set to false in User Schema
  const user = await User.findOne({ email }).select("+password");

  // check if user exists && password is correct
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password!", 401));
  }

  // send the token to client
  createSendToken(user, 200, req, res);
});

exports.logout = (req, res) => {
  // resetting the jwt cookie to log out the user
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
};

// This func is used to protect certain routes for users that have JWT
exports.protect = catchAsync(async (req, res, next) => {
  // Getting the token from req.headers or cookie returned with req
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt && req.cookies.jwt !== "loggedout") {
    token = req.cookies.jwt;
  }

  // Checking if the token exists
  if (!token) {
    return next(
      new AppError(
        "You are not logged in! Please log in to access this page",
        401
      )
    );
  }

  // Verifying if someone has modified the token data, which includes user id, or if it has expired
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError("The user no longer exists.", 401));
  }

  // Check if user changed password after JWT was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again", 401)
    );
  }

  // Pass the user info to the next middlewares in req.user and to the pug templates with res.locals.user
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// This func is used to verify that the user still has valid JWT as cookie
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // Check if user changed password after JWT was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // There is a logged in user so make them accessable to templates
      res.locals.user = currentUser; // in pug templates there'll be a var called user
      return next();
    } catch (err) {
      // There is no logged in user
      return next();
    }
  }
  next();
};

// roles are passed from routers to restrict access to urls for specific types of users
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // this middleware will run after protect so it will get access to the req.user prop
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }

    next();
  };
};

// This func sends temporary reset token to the client to change password
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // Query user according to the email in req
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(
      new AppError("There is no user with the provided email address.", 404)
    );
  }

  const resetToken = user.createPasswordResetToken();
  // need to update the doc by saving it. Validation is set to false to avoid error for not providing required fields
  await user.save({ validateBeforeSave: false });

  // send the reset token url to the user's email
  try {
    const resetURL = `${req.protocol}://${req.get(
      "host"
    )}/api/v1/users/resetPassword/${resetToken}`;
    // (Email functionality not setup)
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    // if an error happens, the 2 fields below need to be set to undefined
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        "An error occured while sending the email. Try again later!",
        500
      )
    );
  }
});

// This func allows the user to change their password if they have valid reset token
exports.resetPassword = catchAsync(async (req, res, next) => {
  // Query user based on the reset token in req
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // If token has not expired and the user exists set the new password
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Log the user in, send new JWT
  createSendToken(user, 200, req, res);
});

// Changing password while logged in
exports.updatePassword = catchAsync(async (req, res, next) => {
  // Query user from collection. This middleware will be used after protect middleware which sets req.user
  const user = await User.findById(req.user.id).select("+password");

  // Check if the posted current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(
      new AppError(
        "Incorrect password! Please Enter your current password.",
        401
      )
    );
  }

  // Update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // Log in the user with the new password, send JWT
  createSendToken(user, 200, req, res);
});
