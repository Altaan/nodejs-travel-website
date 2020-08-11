const Tour = require("../models/tourModel");
const Booking = require("../models/bookingModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

// middleware used to show alerts for templates when needed
exports.alerts = (req, res, next) => {
  const { alert } = req.query;
  // getCheckoutSession in bookingController passes the query alert=booking in the url
  if (alert === "booking") {
    res.locals.alert = "Your booking was successful!";
  }
};

// Used by overview template to view all tours on home page
exports.getOverview = catchAsync(async (req, res, next) => {
  // Get all tours data from collection
  const tours = await Tour.find();

  // Render the template with tours data
  res.status(200).render("overview", {
    title: "All Tours",
    tours,
  });
});

// Used to show detailed view of a specific tour
exports.getTour = catchAsync(async (req, res, next) => {
  // Get the data: tour, reviews and tour guides
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: "reviews",
    select: "review rating user",
  });

  // returning an error if the user requests wrong tour url
  if (!tour) {
    return next(new AppError("There is no tour with that name.", 404));
  }

  res.status(200).render("tour", {
    title: `${tour.name} Tour`,
    tour,
  });
});

exports.getSignupForm = (req, res) => {
  res.status(200).render("signup", {
    title: "Sign up for great adventures",
  });
};

exports.getLoginForm = (req, res) => {
  res.status(200).render("login", {
    title: "Login into your account",
  });
};

// User account page
exports.getAccount = (req, res) => {
  res.status(200).render("account", {
    title: "Your account",
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  // Find all bookings for a specific user
  const bookings = await Booking.find({ user: req.user.id });

  // Find tours with the returned IDs from booking query
  const tourIDs = bookings.map((el) => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).render("overview", {
    title: "My Tours",
    tours,
  });
});
