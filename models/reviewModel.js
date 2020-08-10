const mongoose = require("mongoose");
const Tour = require("./tourModel");

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, "Review can not be empty!"],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    // Parent referencing to Tour and User models
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: "Tour",
      required: [true, "Review must belong to a tour."],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a user."],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Query middleware used to populate the review docs with user data
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "name photo",
  });
  next();
});

// Static method used to aggregate values to get ratingsQuantity and ratingsAverage for every tour
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // this points to the current model
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        // _id refers to the common field in all docs
        _id: "$tour",
        // adding 1 to nRating for every matching doc
        nRating: { $sum: 1 },
        // using the rating field in every doc to get the avgRating
        avgRating: { $avg: "$rating" },
      },
    },
  ]);

  if (stats.length > 0) {
    // Updating the fields in the Tour model
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    // Setting the stats to the default values
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

// Using index to prevent duplicate reviews from the same user on the same tour
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// Using a middleware to call calcAverageRatings after a review doc is saved
reviewSchema.post("save", function () {
  this.constructor.calcAverageRatings(this.tour);
});

// Query middleware used to get the doc for which the query to delete or update was requested
reviewSchema.pre(/^findOneAnd/, async function (next) {
  // using this.rev to pass the data to the post middleware
  this.rev = await this.findOne(); // executing findOne() to access the current doc to get the tour id
  next();
});

// Query middleware used to update the stats after the review has been deleted or updated
reviewSchema.post(/^findOneAnd/, async function () {
  // the rev doc will have the tour id in tour field
  this.rev.constructor.calcAverageRatings(this.rev.tour);
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
