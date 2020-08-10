class APIFeatures {
  constructor(query, queryString) {
    // query will hold the Query obj returned by Model.find()
    this.query = query;
    // queryString will have the query string from req.query
    this.queryString = queryString;
  }

  filter() {
    // removing the props that has to be excluded from the querySting
    const queryObj = { ...this.queryString };
    const excludedFields = ["page", "sort", "limit", "fields"];
    excludedFields.forEach((el) => delete queryObj[el]);

    // console.log(req.query, queryObj);

    // modifying queries containing operators in order to add the $ sign before the operators
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    // console.log(JSON.parse(queryStr));

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      // the sort prop values will be sparated by commas which have to be changed to spaces
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      // default sorting if no sorting was passed through the url
      this.query = this.query.sort("-createdAt");
    }

    return this;
  }

  limitFields() {
    // allowing the client to select specific fields to be returned in res
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      // excluding __v field, which is used by mongoose, from the res
      this.query = this.query.select("-__v");
    }

    return this;
  }

  paginate() {
    // defining values for page and limit
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;
    // setting the query according to the requested page and limit
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
