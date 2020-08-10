const mongoose = require("mongoose");
const slugify = require("slugify");

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A tour must have a name"],
      unique: true,
      trim: true,
      maxlength: [
        40,
        "A tour name must have less than or equal to 40 characters",
      ],
      minlength: [
        10,
        "A tour name must have more than or equal to 10 characters",
      ],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, "A tour must have a duration"],
    },
    maxGroupSize: {
      type: Number,
      required: [true, "A tour must have a group size"],
    },
    difficulty: {
      type: String,
      required: [true, "A tour must have difficulty"],
      enum: {
        values: ["easy", "medium", "difficult"],
        message: "Difficulty is either: easy, medium or difficult",
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, "Rating must be 1.0 or higher"],
      max: [5, "Rating must be 5.0 or less"],
      // setter will run everytime there's a new value
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, "A tour must have a price"],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // this only points to current doc if it's newly created. It won't refer to updated doc
          return val < this.price;
        },
        message: "Discount price ({VALUE}) should be less than the price",
      },
    },
    summary: {
      type: String,
      required: [true, "A tour must have a summary"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, "A tour must have a cover image"],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    // To add Geospatial field, an obj has to include type, of type String, and coordinates properties
    startLocation: {
      type: {
        type: String,
        default: "Point",
        enum: ["Point"],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    // Embedding location docs
    locations: [
      {
        type: {
          type: String,
          default: "Point",
          enum: ["Point"],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    // Child Referencing the guides from User model
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    // used for virtual properties
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Using single index to improve read performance for a query of one field
tourSchema.index({ slug: 1 });

// for geospatial data the index has to be 2d sphere, an Earth like sphere where all data is located
tourSchema.index({ startLocation: "2dsphere" });

// Compound index for queries of 1 or more than 1 field
tourSchema.index({ price: 1, ratingsAverage: -1 });

// Virtual Properties will be created everytime data is obtained from the db but they are not stored in db
tourSchema.virtual("durationWeeks").get(function () {
  return this.duration / 7;
});

// Virtual property to avoid having large array of reviews in every tour doc
tourSchema.virtual("reviews", {
  ref: "Review",
  // specify the name of the field that need to be populated in the other model
  foreignField: "tour",
  // this is field that is used by the other model to call docs from this model
  localField: "_id",
});

// Doc middleware used to add slug to every doc
tourSchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// Query middleware used to remove secretTours from queries
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  next();
});

// Query middleware to populate references in tour docs with data from other collections
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: "guides",
    select: "-__v -passwordChangedAt",
  });
  next();
});

const Tour = mongoose.model("Tour", tourSchema);

module.exports = Tour;
