const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam } = validate;
const {
  createRequest,
  listRequests,
  getRequest,
  updateStatus,
  cancelRequest,
  declineRequest,
  rateRequest,
  listMessages,
  createRequestRules,
  updateStatusRules,
  rateRules,
} = require("../controllers/requestController");

const router = express.Router();

router.use(protect);
router.post("/", authorize("customer"), createRequestRules, validate, createRequest);
router.get("/", listRequests);
router.get("/:id", idParam, validate, getRequest);
router.get("/:id/messages", idParam, validate, listMessages);
router.patch("/:id/status", authorize("mechanic", "admin"), idParam, updateStatusRules, validate, updateStatus);
router.patch("/:id/decline", authorize("mechanic"), idParam, validate, declineRequest);
router.patch("/:id/cancel", authorize("customer"), idParam, validate, cancelRequest);
router.patch("/:id/rate", authorize("customer"), idParam, rateRules, validate, rateRequest);

module.exports = router;
