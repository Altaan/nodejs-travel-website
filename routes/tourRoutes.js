const express = require("express");
const {
  uploadTourImages,
  resizeTourImages,
  aliasTopTours,
  getMonthlyPlan,
  getTourStats,
  getToursWithin,
  getDistances,
  getAllTours,
  getTour,
  createTour,
  updateTour,
  deleteTour,
} = require("../controllers/tourController");
const { protect, restrictTo } = require("../controllers/authController");
const reviewRouter = require("./reviewRoutes");

const router = express.Router();

// Mounting the review router to allow adding reviews for a specific tour
router.use("/:tourId/reviews", reviewRouter);

router.route("/tour-stats").get(getTourStats);
router
  .route("/monthly-plan/:year")
  .get(protect, restrictTo("admin", "lead-guide", "guide"), getMonthlyPlan);

// using a middleware to handle a popular query and use the route alias below
router.route("/top-5-cheap").get(aliasTopTours, getAllTours);

// route for geospatial queries
router
  .route("/tours-within/:distance/center/:latlng/unit/:unit")
  .get(getToursWithin);

// route for calculating the distance from a certain point to all tours
router.route("/distances/:latlng/unit/:unit").get(getDistances);

// implementing authentication and autherization, for specific roles, to create, update and delete tours
router
  .route("/")
  .get(getAllTours)
  .post(protect, restrictTo("admin", "lead-guide"), createTour);
router
  .route("/:id")
  .get(getTour)
  .patch(
    protect,
    restrictTo("admin", "lead-guide"),
    uploadTourImages,
    resizeTourImages,
    updateTour
  )
  .delete(protect, restrictTo("admin", "lead-guide"), deleteTour);

module.exports = router;
