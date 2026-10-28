// wraps an async route handler so thrown/rejected errors reach the
// centralized errorHandler without a try/catch in every controller
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
