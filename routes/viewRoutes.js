const express = require("express");
const {
  getOverview,
  getTour,
  getSignupForm,
  getLoginForm,
  getAccount,
  getMyTours,
} = require("../controllers/viewsController");
const { protect, isLoggedIn } = require("../controllers/authController");
const bookingController = require("../controllers/bookingController");

const router = express.Router();

router.get(
  "/",
  bookingController.createBookingCheckout,
  isLoggedIn,
  getOverview
);
router.get("/tour/:slug", isLoggedIn, getTour);
router.get("/signup", getSignupForm);
router.get("/login", isLoggedIn, getLoginForm);
router.get("/me", protect, getAccount);
router.get("/my-tours", protect, getMyTours);

module.exports = router;
