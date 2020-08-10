class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    // checking if the statusCode is a client side error to set the status as "fail"
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    // Getting the stack trace to find out where the error occurred
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
