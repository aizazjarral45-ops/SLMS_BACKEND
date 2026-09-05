const mongoose = require('mongoose');
const Reminder = require('../models/Reminder');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { emitDataChange } = require('../config/socket');

const editableFields = ['title', 'type', 'when', 'done'];

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

function serialize(reminder) {
  const value = typeof reminder.toObject === 'function' ? reminder.toObject() : reminder;
  return { ...value, id: String(value._id) };
}

function normalizedDone(value) {
  if (value === true || value === false) return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'done' || value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'pending' || value.toLowerCase() === 'false') return false;
  }
  return value;
}

function validatePayload(body, partial = false) {
  if (!partial && !String(body.title || '').trim()) return 'Reminder title is required';
  if (body.title !== undefined && !String(body.title).trim()) return 'Reminder title cannot be empty';
  if (!partial && !String(body.type || '').trim()) return 'Reminder type is required';
  if (body.type !== undefined && !String(body.type).trim()) return 'Reminder type cannot be empty';
  if (body.when !== undefined && !String(body.when).trim()) return 'Reminder time is required';
  if (!partial && !String(body.when || '').trim()) return 'Reminder time is required';
  if (body.done !== undefined && normalizedDone(body.done) !== true && normalizedDone(body.done) !== false) return 'Done must be a boolean';
  return null;
}

function pickFields(body) {
  const values = {};
  editableFields.forEach((field) => {
    if (body[field] !== undefined) values[field] = field === 'done' ? normalizedDone(body[field]) : body[field];
  });
  if (values.title !== undefined) values.title = String(values.title).trim();
  if (values.type !== undefined) values.type = String(values.type).trim();
  if (values.when !== undefined) values.when = String(values.when).trim();
  return values;
}

const listReminders = asyncHandler(async (req, res) => {
  const reminders = await Reminder.find({ userId: req.userId }).sort({ when: 1, createdAt: -1 });
  return successResponse(res, 'Reminders', { reminders: reminders.map(serialize) }, 200);
});

const getReminder = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return errorResponse(res, 'Invalid reminder id', null, 400);
  const reminder = await Reminder.findOne({ _id: req.params.id, userId: req.userId });
  if (!reminder) return errorResponse(res, 'Reminder not found', null, 404);
  return successResponse(res, 'Reminder', { reminder: serialize(reminder) }, 200);
});

const createReminder = asyncHandler(async (req, res) => {
  const validationError = validatePayload(req.body);
  if (validationError) return errorResponse(res, validationError, null, 400);
  const reminder = await Reminder.create({ ...pickFields(req.body), userId: req.userId });
  emitDataChange({ userId: reminder.userId, resource: 'reminders', action: 'created', record: serialize(reminder) });
  return successResponse(res, 'Reminder created', { reminder: serialize(reminder) }, 201);
});

const updateReminder = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return errorResponse(res, 'Invalid reminder id', null, 400);
  const validationError = validatePayload(req.body, true);
  if (validationError) return errorResponse(res, validationError, null, 400);
  const reminder = await Reminder.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { $set: pickFields(req.body) },
    { new: true, runValidators: true },
  );
  if (!reminder) return errorResponse(res, 'Reminder not found', null, 404);
  emitDataChange({ userId: reminder.userId, resource: 'reminders', action: 'updated', record: serialize(reminder) });
  return successResponse(res, 'Reminder updated', { reminder: serialize(reminder) }, 200);
});

const toggleReminder = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return errorResponse(res, 'Invalid reminder id', null, 400);
  const reminder = await Reminder.findOne({ _id: req.params.id, userId: req.userId });
  if (!reminder) return errorResponse(res, 'Reminder not found', null, 404);
  reminder.done = !reminder.done;
  await reminder.save();
  emitDataChange({ userId: reminder.userId, resource: 'reminders', action: 'updated', record: serialize(reminder) });
  return successResponse(res, 'Reminder status updated', { reminder: serialize(reminder) }, 200);
});

const deleteReminder = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return errorResponse(res, 'Invalid reminder id', null, 400);
  const reminder = await Reminder.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!reminder) return errorResponse(res, 'Reminder not found', null, 404);
  emitDataChange({ userId: reminder.userId, resource: 'reminders', action: 'deleted', id: reminder._id });
  return successResponse(res, 'Reminder deleted', {}, 200);
});

module.exports = { listReminders, getReminder, createReminder, updateReminder, toggleReminder, deleteReminder };
