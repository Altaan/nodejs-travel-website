const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please tell us your name!"],
  },
  email: {
    type: String,
    required: [true, "Please provide your email"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Please provide a valid email"],
  },
  photo: {
    type: String,
    default: "default.jpg",
  },
  role: {
    type: String,
    enum: ["user", "guide", "lead-guide", "admin"],
    default: "user",
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: 8,
    // necessary in order to avoid returning this field in res
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your password"],
    validate: {
      // This only works on CREATE and SAVE!!!
      validator: function (el) {
        return el === this.password;
      },
      message: "Passwords are not the same",
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

// Doc middleware used to hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  // the 2nd arg is the cost arg which determines how cpu intensive this operation will be, default value is 10.
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

// Doc middleware used to update the passwordChangedAt after the user changes password
userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  // subtracting 1s for delays in saving the doc. This is to ensure that the JWT is created after password was changed
  this.passwordChangedAt = Date.now() - 1000;

  next();
});

// Query middleware used to not show inactive users in any find query
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

// Instance method which will be available on all docs in a collection
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  // returning true if the password used during log in is correct
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Checking if the user has changed their password after the issuing of JWT
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  // if the field passwordChangedAt doesn't exist then the user has not changed their password
  if (this.passwordChangedAt) {
    // changing the date format stored in db
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    // will be true if the password was changed after the creation of JWT
    return JWTTimestamp < changedTimestamp;
  }
  // returning false if the password never changed
  return false;
};

// Returning a new token to allow the user to reset their password
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  // storing the encrypted version of the reset token
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // console.log({ resetToken }, this.passwordResetToken);
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
