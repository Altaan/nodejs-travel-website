module.exports = (fn) => {
  return (req, res, next) => {
    // next will have the err passed to it automatically, which the global error controller in app.js will take care of
    fn(req, res, next).catch(next);
  };
};
