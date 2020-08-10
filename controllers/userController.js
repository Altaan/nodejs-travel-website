const multer = require("multer");
const sharp = require("sharp");

const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const factory = require("./handlerFactory");

// Storing the image as a buffer so it can be later accessed from req.file.buffer
const multerStorage = multer.memoryStorage();

// checking if the uploaded file is an image
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! Please upload only images.", 400), false);
  }
};

// Configure multer upload
const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

// specify the name of the field in the user doc where the photo name is stored, i.e. photo
exports.uploadUserPhoto = upload.single("photo");

// middleware used after the photo is uploaded to format the image
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  // move to the next middleware if there is no image uploaded
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// Middleware used to get the Id of the user
exports.getMe = (req, res, next) => {
  // protect will pass req.user
  req.params.id = req.user.id;
  next();
};

// Middleware used to allow the user to update their name, email or profile image
exports.updateMe = catchAsync(async (req, res, next) => {
  // Create error if user posts password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword",
        400
      )
    );
  }

  // Filtering out unwanted field names in the req to only allow certain fields to be updated
  const filteredBody = filterObj(req.body, "name", "email");
  // adding image name to the photo prop of filteredBody to be saved in DB
  if (req.file) filteredBody.photo = req.file.filename;

  // Update user doc
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: "error",
    message: "This route is not yet defined! Please use /signup instead",
  });
};

exports.getAllUsers = factory.getAll(User);

exports.getUser = factory.getOne(User);

// DON'T update passwords with this controller, findByIdAndUpdate() is used
exports.updateUser = factory.updateOne(User); // used by admin

exports.deleteUser = factory.deleteOne(User);
