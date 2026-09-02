const Expense = require("../models/Expense");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { createNotification } = require("../services/notificationService");
const { recordStatusChange } = require("../services/statusService");
const fields = [
  "title",
  "category",
  "amount",
  "date",
  "paymentMethod",
  "description",
  "location",
  "receipt",
  "receiptUrl",
  "status",
];
const listExpenses = asyncHandler(async (req, res) => {
  const expenses = await Expense.find(
    req.user.role === "student" ? { userId: req.user._id } : {},
  ).sort({ createdAt: -1 });
  return successResponse(res, "Expenses", { expenses }, 200);
});
const createExpense = asyncHandler(async (req, res) => {
  if (
    !String(req.body.title || "").trim() ||
    !Number.isFinite(Number(req.body.amount)) ||
    Number(req.body.amount) < 0
  )
    return errorResponse(
      res,
      "A title and a valid non-negative amount are required",
      null,
      400,
    );
    
  const expense = await Expense.create({
    userId: req.user._id,
    title: String(req.body.title).trim(),
    category: req.body.category || "Miscellaneous",
    amount: Number(req.body.amount),
    date: req.body.date || new Date().toISOString().slice(0, 10),
    paymentMethod: req.body.paymentMethod || "Cash",
    description: req.body.description || "",
    location: req.body.location || "",
    receipt: req.body.receipt || "N/A",
    receiptUrl: req.body.receiptUrl || "",
    status: "Pending",
  });
  await createNotification({
    userId: req.user._id,
    sourceUserId: req.user._id,
    title: "Expense submitted",
    message: `Your expense "${expense.title}" has been submitted for review.`,
    type: "expense",
    module: "expenses",
    relatedModel: "Expense",
    relatedId: expense._id,
    notifyAdmins: true,
  });
  return successResponse(res, "Expense created", { expense }, 201);
});
const updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) return errorResponse(res, "Expense not found", null, 404);
  if (
    req.user.role === "student" &&
    String(expense.userId) !== String(req.user._id)
  )
    return errorResponse(res, "Forbidden", null, 403);
  if (req.body.amount !== undefined &&
    (!Number.isFinite(Number(req.body.amount)) || Number(req.body.amount) < 0)) {
  return errorResponse(res, "Amount must be a valid non-negative number", null, 400);
  }
  const previousStatus = expense.status;
  fields.forEach((field) => {
    if (
      req.body[field] !== undefined &&
      (req.user.role !== "student" || field !== "status")
    )
      expense[field] =
        field === "amount" ? Number(req.body[field]) : req.body[field];
  });
  await expense.save();
  if (req.user.role !== "student") {
    if (previousStatus !== expense.status)
      await recordStatusChange({
        entityType: "Expense",
        entityId: expense._id,
        previousStatus,
        newStatus: expense.status,
        changedBy: req.user._id,
        changedByRole: req.user.role,
        reason: req.body.reason || "Expense reviewed",
        comment: req.body.comment || "",
      });
    await createNotification({
      userId: expense.userId,
      sourceUserId: req.user._id,
      title: "Expense updated",
      message: `Your expense "${expense.title}" is now ${expense.status}.`,
      type: "expense",
      module: "expenses",
      relatedModel: "Expense",
      relatedId: expense._id,
    });
  }
  return successResponse(res, "Expense updated", { expense }, 200);
});
const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) return errorResponse(res, "Expense not found", null, 404);
  if (
    req.user.role === "student" &&
    String(expense.userId) !== String(req.user._id)
  )
    return errorResponse(res, "Forbidden", null, 403);
  await expense.deleteOne();
  return successResponse(res, "Expense deleted", {}, 200);
});
module.exports = { listExpenses, createExpense, updateExpense, deleteExpense }
