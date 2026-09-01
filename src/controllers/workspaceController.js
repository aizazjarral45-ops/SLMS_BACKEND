const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const Complaint = require('../models/Complaint');
const Expense = require('../models/Expense');
const Hostel = require('../models/Hostel');
const Assignment = require('../models/Assignment');
const Academic = require('../models/Academic');
const Fee = require('../models/Fee');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const AdminRecord = require('../models/AdminRecord');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification } = require('../services/notificationService');
const { recordStatusChange } = require('../services/statusService');

const GENERIC_SCOPES = new Set(['rooms', 'allocations', 'categories', 'reminders', 'settings', 'courses', 'exams', 'attendance', 'results']);
const ENTITY_MODELS = { complaints: Complaint, expenses: Expense, hostel: Hostel, assignments: Assignment, fees: Fee };
const ENTITY_FIELDS = {
  complaints: ['title', 'category', 'priority', 'description', 'department', 'status', 'resolution'],
  expenses: ['title', 'category', 'amount', 'date', 'paymentMethod', 'description', 'location', 'receipt', 'receiptUrl', 'status'],
  hostel: ['applicationNo', 'fullName', 'studentId', 'email', 'phone', 'gender', 'program', 'semester', 'guardianName', 'guardianPhone', 'emergencyName', 'emergencyPhone', 'roomId', 'block', 'roomType', 'capacity', 'occupied', 'status', 'feesPerSemester', 'feesPaidThisMonth', 'paymentDueDate', 'feesStatus', 'checkInDate'],
  assignments: ['title', 'course', 'dueDate', 'priority', 'description', 'status'],
  fees: ['feeType', 'amount', 'dueDate', 'paidAmount', 'status', 'invoiceNumber', 'paymentMethod'],
};

const asId = (value) => value && value.toString();
const cleanRecord = (document) => {
  const value = document && typeof document.toObject === 'function' ? document.toObject() : document;
  if (!value) return value;
  return { ...value, id: asId(value._id || value.id), key: asId(value._id || value.id) };
};

async function resolveTargetUser(value) {
  if (!value) return null;
  if (/^[a-f\d]{24}$/i.test(String(value))) return value;
  const profile = await StudentProfile.findOne({ studentId: String(value) }).select('userId').lean();
  return profile?.userId || null;
}

const getWorkspace = asyncHandler(async (_req, res) => {
  const [profiles, users, complaints, expenses, hostels, assignments, academic, fees, roles, permissions, records] = await Promise.all([
    StudentProfile.find({}).lean(),
    User.find({}).select('-passwordHash').lean(),
    Complaint.find({}).lean(),
    Expense.find({}).lean(),
    Hostel.find({}).lean(),
    Assignment.find({}).lean(),
    Academic.find({}).lean(),
    Fee.find({}).lean(),
    Role.find({}).lean(),
    Permission.find({}).lean(),
    AdminRecord.find({}).lean(),
  ]);
  const usersById = new Map(users.map((user) => [asId(user._id), user]));
  const students = profiles.map((profile) => {
    const user = usersById.get(asId(profile.userId)) || {};
    return { ...cleanRecord(profile), id: asId(profile.userId), userId: asId(profile.userId), studentId: profile.studentId || asId(profile.userId), name: profile.fullName || user.name || '', email: profile.universityEmail || user.email || '', status: user.status || 'Active' };
  });
  const mapOwned = (items) => items.map((item) => ({ ...cleanRecord(item), userId: asId(item.userId), studentId: asId(item.userId) }));
  const generic = records.reduce((all, item) => {
    const row = { ...(item.data || {}), id: item.recordId, key: item.recordId, targetUserId: asId(item.targetUserId) };
    (all[item.scope] ||= []).push(row);
    return all;
  }, {});
  const academicRows = { courses: [], exams: [], attendance: [], results: [] };
  academic.forEach((record) => {
    ['courses', 'exams', 'attendance', 'results'].forEach((kind) => {
      (record[kind] || []).forEach((row) => academicRows[kind].push({ ...row, id: asId(row._id), studentId: asId(record.userId), userId: asId(record.userId) }));
    });
  });
  return successResponse(res, 'Admin workspace', {
    admin: { students, users: users.map(cleanRecord), roles: roles.map(cleanRecord), permissions: permissions.map(cleanRecord), rooms: generic.rooms || [], allocations: generic.allocations || [], categories: generic.categories || [] },
    complaints: mapOwned(complaints),
    expenses: mapOwned(expenses),
    hostelApplications: mapOwned(hostels),
    hostelFees: mapOwned(fees),
    academic: { ...academicRows, assignments: mapOwned(assignments) },
    settings: { reminders: generic.reminders || [], ...(generic.settings?.[0] || {}) },
  }, 200);
});

const saveGenericRecord = asyncHandler(async (req, res) => {
  const { scope } = req.params;
  const record = req.body.record || {};
  if (!GENERIC_SCOPES.has(scope) || !record.id) return errorResponse(res, 'A valid workspace record is required', null, 400);
  const targetUserId = await resolveTargetUser(record.studentId || record.targetUserId);
  const saved = await AdminRecord.findOneAndUpdate(
    { scope, recordId: String(record.id) },
    { $set: { data: record, targetUserId, createdBy: req.user._id } },
    { upsert: true, new: true, runValidators: true },
  );
  if (targetUserId && req.body.notify) {
    await createNotification({ userId: targetUserId, sourceUserId: req.user._id, title: req.body.title || 'SLMS record updated', message: req.body.message || 'An administrator updated a record related to your account.', type: scope, module: scope });
  }
  return successResponse(res, 'Workspace record saved', { record: { ...(saved.data || {}), id: saved.recordId } }, 200);
});

const deleteGenericRecord = asyncHandler(async (req, res) => {
  const { scope, id } = req.params;
  if (!GENERIC_SCOPES.has(scope)) return errorResponse(res, 'Unsupported workspace record', null, 400);
  await AdminRecord.deleteOne({ scope, recordId: id });
  return successResponse(res, 'Workspace record deleted', {}, 200);
});

const updateEntity = asyncHandler(async (req, res) => {
  const { entity, id } = req.params;
  const Model = ENTITY_MODELS[entity];
  if (!Model) return errorResponse(res, 'Unsupported entity', null, 400);
  const item = await Model.findById(id);
  if (!item) return errorResponse(res, 'Record not found', null, 404);
  const previousStatus = item.status;
  ENTITY_FIELDS[entity].forEach((field) => { if (req.body[field] !== undefined) item[field] = req.body[field]; });
  await item.save();
  if (previousStatus !== item.status) {
    await recordStatusChange({ entityType: entity, entityId: item._id, previousStatus, newStatus: item.status, changedBy: req.user._id, changedByRole: req.user.role, reason: req.body.reason || 'Updated by administrator', comment: req.body.resolution || req.body.comment || '' });
  }
  await createNotification({ userId: item.userId, sourceUserId: req.user._id, title: `${entity.slice(0, -1)} updated`, message: `Your ${entity.slice(0, -1)}${item.status ? ` is now ${item.status}` : ' was updated'}.`, type: entity, module: entity, relatedModel: Model.modelName, relatedId: item._id });
  return successResponse(res, 'Record updated', { record: cleanRecord(item) }, 200);
});

const deleteEntity = asyncHandler(async (req, res) => {
  const { entity, id } = req.params;
  const Model = ENTITY_MODELS[entity];
  if (!Model) return errorResponse(res, 'Unsupported entity', null, 400);
  const item = await Model.findById(id);
  if (!item) return errorResponse(res, 'Record not found', null, 404);
  await item.deleteOne();
  await createNotification({ userId: item.userId, sourceUserId: req.user._id, title: `${entity.slice(0, -1)} removed`, message: `An administrator removed a ${entity.slice(0, -1)} related to your account.`, type: entity, module: entity });
  return successResponse(res, 'Record deleted', {}, 200);
});

module.exports = { getWorkspace, saveGenericRecord, deleteGenericRecord, updateEntity, deleteEntity };
