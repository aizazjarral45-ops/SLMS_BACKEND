const express = require("express");
const {
  listHostelRecords,
  createHostelRecord,
  updateHostelRecord,
  deleteHostelRecord,
  submitHostelApplication,
  updateHostelApplication,
  getMyHostelApplication,
  getAllHostelApplications,
  updateHostelApplicationStatus,
} = require("../controllers/hostelController");
const { authorize } = require("../middleware/authorize");
const router = express.Router();
router.get("/", listHostelRecords);
router.post("/apply", authorize("student"), submitHostelApplication);
router.put("/update/:id", authorize("student"), updateHostelApplication);
router.put("/update", authorize("student"), updateHostelApplication);
router.get("/my-application", authorize("student"), getMyHostelApplication);
router.get(
  "/admin/all",
  authorize("admin", "super_admin"),
  getAllHostelApplications,
);
router.put(
  "/admin/update-status/:id",
  authorize("admin", "super_admin"),
  updateHostelApplicationStatus,
);
router.put(
  "/admin/allocate/:id",
  authorize("admin", "super_admin"),
  updateHostelApplicationStatus,
);
router.post(
  "/",
  authorize("student", "admin", "super_admin"),
  createHostelRecord,
);
router.put(
  "/:id",
  authorize("student", "admin", "super_admin"),
  updateHostelRecord,
);
router.delete(
  "/:id",
  authorize("student", "admin", "super_admin"),
  deleteHostelRecord,
);
module.exports = router;
