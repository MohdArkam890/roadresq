const { validationResult, param } = require("express-validator");
const { AppError } = require("./errorHandler");

// EXPERIMENT 5 — every mutating route runs express-validator rules,
// then this middleware turns any failure into a single 422 AppError
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors
      .array()
      .map((e) => `${e.path}: ${e.msg}`)
      .join("; ");
    return next(new AppError(message, 422));
  }
  next();
}

// reusable rule: rejects malformed ObjectIds with a clean 422 up front
// instead of letting Mongoose throw a CastError deep in a controller
const idParam = [param("id").isMongoId().withMessage("Invalid id")];

module.exports = validate;
module.exports.idParam = idParam;
