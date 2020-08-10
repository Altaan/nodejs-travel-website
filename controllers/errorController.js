const AppError = require("../utils/appError");

// Showing better error messages for DB errors
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldDB = (err) => {
  const value = Object.values(err.keyValue)[0];
  const message = `Duplicate field value: ${value}. Please use another value`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);

  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

// Handling JWT error messages
const handleJWTError = () =>
  new AppError("Invalid token. Please log in again!", 401);

const handleJWTExpiredError = () =>
  new AppError("Your token has expired! Please log in again.", 401);

// Selecting the response for development errors
const sendErrorDev = (err, req, res) => {
  // 1) API: originalUrl is the entire url without the host
  if (req.originalUrl.startsWith("/api")) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }

  // 2) RENDERED WEBSITE: rendering an error template in case the url doesn't match anything
  console.error("Error!!!", err);
  return res.status(err.statusCode).render("error", {
    title: "Something went wrong!",
    msg: err.message,
  });
};

// Production error responses
const sendErrorProd = (err, req, res) => {
  // 1) API
  if (req.originalUrl.startsWith("/api")) {
    // A) Operational, trusted error so send message to the client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    // B) Programming or other unknown error so don't leak error details
    // Log the error
    console.error("Error!!!", err);

    // Send generic message
    return res.status(500).json({
      status: "error",
      message: "Something went wrong!",
    });
  }

  // 2) RENDERED WEBSITE
  // A) Operational, trusted error so send message to the client
  if (err.isOperational) {
    return res.status(err.statusCode).render("error", {
      title: "Something went wrong!",
      msg: err.message,
    });
  }
  // B) Programming or other unknown error so don't leak error details
  // Log the error
  console.error("Error!!!", err);

  // Send generic message
  return res.status(err.statusCode).render("error", {
    title: "Something went wrong!",
    msg: "Please try again later",
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  // err.status will be fail if it is 400 statusCode
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = { name: err.name, message: err.message };
    error = Object.assign(error, err);
    // handling request with invalid id
    if (error.name === "CastError") error = handleCastErrorDB(error);
    // handling duplicate db fields
    if (error.code === 11000) error = handleDuplicateFieldDB(error);
    // handling Mongoose validation errors
    if (error.name === "ValidationError")
      error = handleValidationErrorDB(error);
    // JWT error invalid token
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    // JWT error expired token
    if (error.name === "TokenExpiredError") error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};
