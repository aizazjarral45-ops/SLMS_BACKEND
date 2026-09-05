const Assignment = require("../models/Assignment");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { recordStatusChange } = require("../services/statusService");
const { isValidObjectId } = require("../utils/objectId");
const { emitDataChange } = require("../config/socket");
const fields = [
  "title",
  "course",
  "dueDate",
  "priority",
  "status",
  "description",
];
const listAssignments = asyncHandler(async (req, res) => {
  const assignments = await Assignment.find(
    req.user.role === "student" ? { userId: req.user._id } : {},
  ).sort({ dueDate: 1, createdAt: -1 });
  return successResponse(res, "Assignments", { assignments }, 200);
});
const createAssignment = asyncHandler(async (req, res) => {
  if (!String(req.body.title || "").trim())
    return errorResponse(res, "Assignment title is required", null, 400);
  const assignment = await Assignment.create({
    userId: req.user._id,
    title: String(req.body.title).trim(),
    course: req.body.course || "",
    dueDate: req.body.dueDate || "",
    priority: req.body.priority || "Medium",
    status: req.body.status || "To do",
    description: req.body.description || "",
  });
  emitDataChange({ userId: assignment.userId, resource: "academic", action: "created", record: assignment });
  return successResponse(res, "Assignment created", { assignment }, 201);
});
const updateAssignment = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return errorResponse(res, "Assignment not found", null, 404);
  const item = await Assignment.findById(req.params.id);
  if (!item) return errorResponse(res, "Assignment not found", null, 404);
  if (
    req.user.role === "student" &&
    String(item.userId) !== String(req.user._id)
  )
    return errorResponse(res, "Forbidden", null, 403);
  const previousStatus = item.status;
  fields.forEach((field) => {
    if (req.body[field] !== undefined) item[field] = req.body[field];
  });
  await item.save();
  if (req.user.role !== "student") {
    if (previousStatus !== item.status)
      await recordStatusChange({
        entityType: "Assignment",
        entityId: item._id,
        previousStatus,
        newStatus: item.status,
        changedBy: req.user._id,
        changedByRole: req.user.role,
        reason: req.body.reason || "Assignment updated",
        comment: req.body.comment || "",
      });
    await createNotification({
      userId: item.userId,
      sourceUserId: req.user._id,
      title: "Assignment updated",
      message: `Your assignment "${item.title}" is now ${item.status}.`,
      type: "assignment",
      module: "assignments",
      relatedModel: "Assignment",
      relatedId: item._id,
    });
  }
  emitDataChange({ userId: item.userId, resource: "academic", action: "updated", record: item });
  return successResponse(res, "Assignment updated", { assignment: item }, 200);
});
const deleteAssignment = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return errorResponse(res, "Assignment not found", null, 404);
  const item = await Assignment.findById(req.params.id);
  if (!item) return errorResponse(res, "Assignment not found", null, 404);
  if (
    req.user.role === "student" &&
    String(item.userId) !== String(req.user._id)
  )
    return errorResponse(res, "Forbidden", null, 403);
  await item.deleteOne();
  emitDataChange({ userId: item.userId, resource: "academic", action: "deleted", id: item._id });
  return successResponse(res, "Assignment deleted", {}, 200);
});
module.exports = {
  listAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
};
