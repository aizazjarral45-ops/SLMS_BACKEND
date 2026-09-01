const express = require("express");
const {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} = require("../controllers/expenseController");
const { authorize } = require("../middleware/authorize");
const { updatePreferences } = require("../controllers/preferenceController");
const router = express.Router();
router.get("/", listExpenses);
router.post("/", authorize("student"), createExpense);
router.put("/budget/update", authorize("student", "admin", "super_admin"), updatePreferences);
router.put("/:id", authorize("student", "admin", "super_admin"), updateExpense);
router.delete(
  "/:id",
  authorize("student", "admin", "super_admin"),
  deleteExpense,
);
module.exports = router;
