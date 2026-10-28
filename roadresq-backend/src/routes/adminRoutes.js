const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const { stats, listUsers } = require("../controllers/adminController");

const router = express.Router();

router.use(protect, authorize("admin"));
router.get("/stats", stats);
router.get("/users", listUsers);

module.exports = router;
