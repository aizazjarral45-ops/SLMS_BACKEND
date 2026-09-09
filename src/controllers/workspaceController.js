const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const Complaint = require('../models/Complaint');
const Expense = require('../models/Expense');
const Hostel = require('../models/Hostel');
const HostelApplication = require('../models/HostelApplication');
const Assignment = require('../models/Assignment');
const Academic = require('../models/Academic');
const Fee = require('../models/Fee');
const Course = require('../models/Course');
const Exam = require('../models/Exam');
const Attendance = require('../models/Attendance');
const AcademicProfile = require('../models/AcademicProfile');
const Request = require('../models/Request');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const Reminder = require('../models/Reminder');
const UploadedFile = require('../models/UploadedFile');
const AIConversation = require('../models/AIConversation');
const Preference = require('../models/Preference');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const AdminRecord = require('../models/AdminRecord');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification } = require('../services/notificationService');
const { recordStatusChange } = require('../services/statusService');
const { isValidObjectId } = require('../utils/objectId');

const GENERIC_SCOPES = new Set(['rooms', 'allocations', 'categories', 'reminders', 'settings', 'courses', 'exams', 'attendance', 'results']);
const ENTITY_MODELS = { complaints: Complaint, expenses: Expense, hostel: Hostel, assignments: Assignment, fees: Fee };
const ENTITY_FIELDS = {
  complaints: ['title', 'category', 'priority', 'description', 'department', 'status', 'resolution'],
  expenses: ['title', 'category', 'amount', 'date', 'paymentMethod', 'description', 'location', 'receipt', 'receiptUrl', 'status'],
  hostel: ['applicationNo', 'fullName', 'studentId', 'email', 'phone', 'gender', 'program', 'semester', 'guardianName', 'guardianPhone', 'emergencyName', 'emergencyPhone', 'roomId', 'block', 'roomType', 'capacity', 'occupied', 'status', 'feesPerSemester', 'feesPaidThisMonth', 'paymentDueDate', 'feesStatus', 'checkInDate'],
  assignments: ['title', 'course', 'dueDate', 'priority', 'description', 'status'],
  fees: ['feeType', 'amount', 'dueDate', 'paidAmount', 'status', 'invoiceNumber', 'paymentMethod'],
};

const asId = (value) => {
  if (!value) return value;
  return value._id ? value._id.toString() : value.toString();
};
const profileForReference = (reference, profilesByUserId, profiles) => {
  if (!reference) return {};
  const value = asId(reference);
  return profilesByUserId.get(value) ||
    profiles.find((profile) =>
      [profile.studentId, profile.rollNo].filter(Boolean).map(String).includes(value),
    ) || {};
};
const cleanRecord = (document) => {
  const value = document && typeof document.toObject === 'function' ? document.toObject() : document;
  if (!value) return value;
  return { ...value, id: asId(value._id || value.id), key: asId(value._id || value.id) };
};
const applicationStudentDetails = (application) => ({
  name: application?.studentInformation?.fullName ||
    application?.applicantDetails?.fullName ||
    application?.applicantDetails?.name || '',
  rollNo: application?.studentInformation?.studentId ||
    application?.applicantDetails?.studentId ||
    application?.applicantDetails?.rollNumber || '',
});

async function resolveTargetUser(value) {
  if (!value) return null;
  if (isValidObjectId(String(value))) {
    const exists = await User.exists({ _id: value });
    return exists ? value : null;
  }
  const profile = await StudentProfile.findOne({
    $or: [{ studentId: String(value) }, { rollNo: String(value) }],
  }).select('userId').lean();
  return profile?.userId || null;
}

const getAdminStudents = asyncHandler(async (_req, res) => {
  const [users, profiles] = await Promise.all([
    User.find({ role: 'student' }).select('-passwordHash').sort({ createdAt: -1 }).lean(),
    StudentProfile.find({}).lean(),
  ]);
  const profilesByUserId = new Map(profiles.map((profile) => [asId(profile.userId), profile]));
  const students = users.map((user) => {
    const profile = profilesByUserId.get(asId(user._id)) || {};
    return {
      ...cleanRecord(profile),
      _id: asId(user._id),
      id: asId(user._id),
      userId: asId(user._id),
      studentId: profile.studentId || '',
      rollNo: profile.rollNo || '',
      studentName: profile.fullName || user.name || '',
      name: profile.fullName || user.name || '',
      email: profile.universityEmail || profile.personalEmail || user.email || '',
      status: user.status || 'Active',
    };
  });
  return successResponse(res, 'Admin students', { students }, 200);
});

const getAdminStudent = asyncHandler(async (req, res) => {
  const userId = await resolveTargetUser(req.params.studentId);
  if (!userId) return errorResponse(res, 'Student not found', null, 404);
  const user = await User.findOne({ _id: userId, role: 'student' }).select('-passwordHash').lean();
  if (!user) return errorResponse(res, 'Student not found', null, 404);
  const profile = await StudentProfile.findOne({ userId }).lean() || {};
  const [complaints, expenses, hostelApplications, assignments, academic, fees, courses, exams, attendance, academicProfiles, requests, applications, notifications, reminders, documents, conversations, preferences] = await Promise.all([
    Complaint.find({ userId }).lean(), Expense.find({ userId }).lean(), HostelApplication.find({ studentId: userId }).sort({ createdAt: -1 }).lean(),
    Assignment.find({ userId }).lean(), Academic.findOne({ userId }).lean(), Fee.find({ userId }).lean(),
    Course.find({ userId }).lean(), Exam.find({ userId }).lean(), Attendance.find({ userId }).lean(),
    AcademicProfile.find({ userId }).lean(), Request.find({ userId }).lean(), Application.find({ userId }).lean(),
    Notification.find({ $or: [{ userId }, { recipientId: userId }] }).lean(), Reminder.find({ userId }).lean(),
    UploadedFile.find({ userId }).lean(), AIConversation.find({ userId }).sort({ updatedAt: -1 }).lean(),
    Preference.findOne({ userId }).lean(),
  ]);
  const student = {
    ...cleanRecord(profile), _id: asId(user._id), id: asId(user._id), userId: asId(user._id),
    studentId: profile.studentId || '', rollNo: profile.rollNo || '',
    studentName: profile.fullName || user.name || '', name: profile.fullName || user.name || '',
    email: profile.universityEmail || profile.personalEmail || user.email || '', status: user.status || 'Active',
  };
  const aiSearchHistory = conversations.flatMap((conversation) => (conversation.messages || [])
    .filter((message) => message.role === 'user')
    .map((message) => ({
      id: asId(message._id), conversationId: asId(conversation._id),
      userId: asId(user._id), studentId: profile.studentId || '',
      rollNo: profile.rollNo || '', studentName: profile.fullName || user.name || '',
      query: message.content, createdAt: message.createdAt || conversation.createdAt,
      status: 'Completed', provider: conversation.provider, model: conversation.model,
    })));
  const academicRows = {
    courses: courses.map((row) => ({
      ...cleanRecord(row), userId: asId(userId), studentId: profile.studentId || '',
      rollNo: profile.rollNo || '', studentName: profile.fullName || user.name || '',
    })),
    exams: exams.map((row) => ({
      ...cleanRecord(row), userId: asId(userId), studentId: profile.studentId || '',
      rollNo: profile.rollNo || '', studentName: profile.fullName || user.name || '',
    })),
    attendance: attendance.map((row) => ({
      ...cleanRecord(row), userId: asId(userId), studentId: profile.studentId || '',
      rollNo: profile.rollNo || '', studentName: profile.fullName || user.name || '',
    })),
    results: [],
    profiles: academicProfiles.map((row) => ({
      ...cleanRecord(row), userId: asId(userId), studentId: profile.studentId || '',
      rollNo: profile.rollNo || '', studentName: profile.fullName || user.name || '',
    })),
    assignments: assignments.map((row) => ({
      ...cleanRecord(row), userId: asId(userId), studentId: profile.studentId || '',
      rollNo: profile.rollNo || '', studentName: profile.fullName || user.name || '',
    })),
  };
  ['courses', 'exams', 'attendance', 'results'].forEach((kind) => {
    (academic?.[kind] || []).forEach((row) => academicRows[kind].push({
      ...cleanRecord(row), userId: asId(userId), studentId: profile.studentId || '',
      rollNo: profile.rollNo || '', studentName: profile.fullName || user.name || '',
    }));
  });
  const owned = (rows) => rows.map((row) => {
    const applicationDetails = applicationStudentDetails(row);
    return {
      ...cleanRecord(row), userId: asId(userId),
      studentId: profile.studentId || applicationDetails.rollNo || '',
      rollNo: profile.rollNo || applicationDetails.rollNo || '',
      studentName: profile.fullName || user.name || applicationDetails.name,
    };
  });
  return successResponse(res, 'Admin student workspace', {
    student,
    workspace: {
      admin: { students: [student] }, complaints: owned(complaints), expenses: owned(expenses),
      hostelApplications: owned(hostelApplications), hostelFees: owned(fees), academic: academicRows,
      monthlyBudget: Number(preferences?.monthlyBudget || 0),
      budgetHistory: preferences?.budgetHistory || [],
      requests: owned(requests), applications: owned(applications), notifications: owned(notifications),
      reminders: owned(reminders), documents: owned(documents), aiSearchHistory,
    },
  }, 200);
});

const getWorkspace = asyncHandler(async (_req, res) => {
  const [profiles, users, complaints, expenses, hostelApplications, assignments, academic, fees, roles, permissions, records, courses, exams, attendance, academicProfiles, requests, applications, notifications, reminders, documents, conversations] = await Promise.all([
    StudentProfile.find({}).lean(),
    User.find({}).select('-passwordHash').lean(),
    Complaint.find({}).lean(),
    Expense.find({}).lean(),
    HostelApplication.find({}).sort({ createdAt: -1 }).lean(),
    Assignment.find({}).lean(),
    Academic.find({}).lean(),
    Fee.find({}).lean(),
    Role.find({}).lean(),
    Permission.find({}).lean(),
    AdminRecord.find({}).lean(),
    Course.find({}).lean(),
    Exam.find({}).lean(),
    Attendance.find({}).lean(),
    AcademicProfile.find({}).lean(),
    Request.find({}).lean(),
    Application.find({}).lean(),
    Notification.find({}).lean(),
    Reminder.find({}).lean(),
    UploadedFile.find({}).lean(),
    AIConversation.find({}).sort({ updatedAt: -1 }).lean(),
  ]);
  const usersById = new Map(users.map((user) => [asId(user._id), user]));
  const studentsByUserId = new Map(profiles.map((profile) => [asId(profile.userId), profile]));
  const students = users.filter((user) => user.role === 'student').map((user) => {
    const profile = studentsByUserId.get(asId(user._id)) || {};
    return {
      ...cleanRecord(profile), id: asId(user._id), userId: asId(user._id),
      studentId: profile.studentId || '', rollNo: profile.rollNo || '',
      studentName: profile.fullName || user.name || '',
      name: profile.fullName || user.name || '',
      email: profile.universityEmail || profile.personalEmail || user.email || '',
      status: user.status || 'Active',
    };
  });

  const mapOwned = (items) => items.map((item) => {
    const ownerId = item.userId || item.recipientId || item.studentId;
    const profile = profileForReference(ownerId, studentsByUserId, profiles);
    const user = usersById.get(asId(profile.userId || ownerId)) || {};
    const applicationDetails = applicationStudentDetails(item);
    return {
      ...cleanRecord(item), userId: asId(profile.userId || ownerId),
      studentId: profile.studentId || applicationDetails.rollNo || '',
      rollNo: profile.rollNo || applicationDetails.rollNo || '',
      studentName: profile.fullName || user.name || applicationDetails.name,
    };
  });
  const generic = records.reduce((all, item) => {
    const mongoId = asId(item._id);
    const row = {
      ...(item.data || {}),
      _id: mongoId,
      id: mongoId,
      key: mongoId,
      recordId: item.recordId,
      targetUserId: asId(item.targetUserId || item.data?.userId || item.data?.studentId),
    };
    const profile = profileForReference(row.targetUserId, studentsByUserId, profiles);
    const user = usersById.get(asId(profile.userId || row.targetUserId)) || {};
    row.userId = asId(profile.userId || row.targetUserId);
    row.studentId = profile.studentId || '';
    row.rollNo = profile.rollNo || '';
    row.studentName = profile.fullName || user.name || '';
    (all[item.scope] ||= []).push(row);
    return all;
  }, {});
  const academicRows = {
    courses: mapOwned(courses),
    exams: mapOwned(exams),
    attendance: mapOwned(attendance),
    results: [],
    profiles: academicProfiles.map((profile) => ({
      ...cleanRecord(profile),
      userId: asId(profile.userId),
      studentId: profile.studentId || '',
      rollNo: profile.rollNo || '',
      studentName: profile.fullName || '',
    })),
  };
  const aiSearchHistory = conversations.flatMap((conversation) =>
    (conversation.messages || [])
      .filter((message) => message.role === 'user')
      .map((message) => ({
        id: asId(message._id),
        conversationId: asId(conversation._id),
        userId: asId(conversation.userId),
        studentId: profileForReference(conversation.userId, studentsByUserId, profiles).studentId || '',
        rollNo: profileForReference(conversation.userId, studentsByUserId, profiles).rollNo || '',
        studentName: profileForReference(conversation.userId, studentsByUserId, profiles).fullName ||
          usersById.get(asId(conversation.userId))?.name || '',
        query: message.content,
        createdAt: message.createdAt || conversation.createdAt,
        status: 'Completed',
        provider: conversation.provider,
        model: conversation.model,
      })),
  );
  academic.forEach((record) => {
    ['courses', 'exams', 'attendance', 'results'].forEach((kind) => {
      (record[kind] || []).forEach((row) => {
        const profile = profileForReference(record.userId, studentsByUserId, profiles);
        academicRows[kind].push({
          ...row,
          id: asId(row._id),
          studentId: profile.studentId || '',
          rollNo: profile.rollNo || '',
          studentName: profile.fullName || usersById.get(asId(record.userId))?.name || '',
          userId: asId(record.userId),
        });
      });
    });
  });
  return successResponse(res, 'Admin workspace', {
    admin: { students, users: users.map(cleanRecord), roles: roles.map(cleanRecord), permissions: permissions.map(cleanRecord), rooms: generic.rooms || [], allocations: generic.allocations || [], categories: generic.categories || [] },
    complaints: mapOwned(complaints),
    expenses: mapOwned(expenses),
    hostelApplications: mapOwned(hostelApplications),
    hostelFees: mapOwned(fees),
    academic: { ...academicRows, assignments: mapOwned(assignments) },
    requests: mapOwned(requests),
    applications: mapOwned(applications),
    notifications: mapOwned(notifications),
    reminders: mapOwned(reminders),
    documents: mapOwned(documents),
    aiSearchHistory,
    settings: { reminders: generic.reminders || [], ...(generic.settings?.[0] || {}) },
  }, 200);
});

const saveGenericRecord = asyncHandler(async (req, res) => {
  const { scope } = req.params;
  const record = req.body.record || {};
  if (!GENERIC_SCOPES.has(scope) || !record.id) return errorResponse(res, 'A valid workspace record is required', null, 400);
  const targetReference = record.studentId || record.targetUserId;
  const targetUserId = await resolveTargetUser(targetReference);
  if (targetReference && !targetUserId) {
    return errorResponse(res, 'Target student account not found', null, 404);
  }
  if (scope === 'attendance' && targetUserId) {
    const academic = await Academic.findOne({ userId: targetUserId });
    if (!academic) return errorResponse(res, 'Academic record not found', null, 404);
    const existing = academic.attendance.id(record.id);
    if (existing) {
      ['course', 'attended', 'total'].forEach((field) => {
        if (record[field] !== undefined) existing[field] = record[field];
      });
    } else {
      academic.attendance.push({
        course: record.course,
        attended: record.attended,
        total: record.total,
      });
    }
    await academic.save();
    const saved = existing || academic.attendance[academic.attendance.length - 1];
    return successResponse(res, 'Attendance record saved', {
      record: { ...cleanRecord(saved), studentId: asId(targetUserId), userId: asId(targetUserId) },
    }, 200);
  }
  const usesMongoId = isValidObjectId(String(record.id));
  const lookup = usesMongoId
    ? { _id: record.id, scope }
    : { scope, recordId: String(record.id) };
  const existing = await AdminRecord.findOne(lookup);
  const data = { ...record };
  delete data._id;
  delete data.recordId;
  delete data.key;
  const saved = existing
    ? await AdminRecord.findOneAndUpdate(
      lookup,
      { $set: { data, targetUserId, createdBy: req.user._id } },
      { new: true, runValidators: true },
    )
    : await AdminRecord.create({
      scope,
      recordId: usesMongoId ? `legacy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` : String(record.id),
      data,
      targetUserId,
      createdBy: req.user._id,
    });
  if (targetUserId && req.body.notify) {
    await createNotification({ userId: targetUserId, sourceUserId: req.user._id, title: req.body.title || 'SLMS record updated', message: req.body.message || 'An administrator updated a record related to your account.', type: scope, module: scope });
  }
  return successResponse(res, 'Workspace record saved', {
    record: { ...(saved.data || {}), _id: asId(saved._id), id: asId(saved._id), key: asId(saved._id), recordId: saved.recordId, targetUserId: asId(saved.targetUserId) },
  }, 200);
});

const deleteGenericRecord = asyncHandler(async (req, res) => {
  const { scope, id } = req.params;
  if (!GENERIC_SCOPES.has(scope)) return errorResponse(res, 'Unsupported workspace record', null, 400);
  if (scope === 'attendance' && isValidObjectId(id)) {
    const academic = await Academic.findOne({ 'attendance._id': id });
    if (!academic) return errorResponse(res, 'Attendance record not found', null, 404);
    const attendance = academic.attendance.id(id);
    if (!attendance) return errorResponse(res, 'Attendance record not found', null, 404);
    attendance.deleteOne();
    await academic.save();
    return successResponse(res, 'Attendance record deleted', { id }, 200);
  }
  const lookup = isValidObjectId(id)
    ? { _id: id, scope }
    : { scope, recordId: id };
  const deleted = await AdminRecord.findOneAndDelete(lookup);
  if (!deleted) return errorResponse(res, 'Workspace record not found', null, 404);
  return successResponse(res, 'Workspace record deleted', { id: asId(deleted._id), recordId: deleted.recordId }, 200);
});

const updateEntity = asyncHandler(async (req, res) => {
  const { entity, id } = req.params;
  const Model = ENTITY_MODELS[entity];
  if (!Model) return errorResponse(res, 'Unsupported entity', null, 400);
  if (!isValidObjectId(id)) return errorResponse(res, 'Record not found', null, 404);
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
  if (!isValidObjectId(id)) return errorResponse(res, 'Record not found', null, 404);
  const item = await Model.findById(id);
  if (!item) return errorResponse(res, 'Record not found', null, 404);
  await item.deleteOne();
  await createNotification({ userId: item.userId, sourceUserId: req.user._id, title: `${entity.slice(0, -1)} removed`, message: `An administrator removed a ${entity.slice(0, -1)} related to your account.`, type: entity, module: entity });
  return successResponse(res, 'Record deleted', {}, 200);
});

const createEntity = asyncHandler(async (req, res) => {
  const { entity } = req.params;
  const Model = ENTITY_MODELS[entity];
  if (!Model) return errorResponse(res, 'Unsupported entity', null, 400);
  const input = req.body || {};
  const targetUserId = await resolveTargetUser(input.studentId || input.userId || input.targetUserId);
  if (!targetUserId) return errorResponse(res, 'A valid student is required', null, 400);
  const data = {};
  (ENTITY_FIELDS[entity] || []).forEach((field) => {
    if (input[field] !== undefined) data[field] = input[field];
  });
  data.userId = targetUserId;
  if (entity === 'complaints' && !String(data.description || '').trim()) {
    return errorResponse(res, 'Complaint description is required', null, 400);
  }
  const item = await Model.create(data);
  return successResponse(res, 'Record created', { record: cleanRecord(item) }, 201);
});

module.exports = { getWorkspace, getAdminStudents, getAdminStudent, saveGenericRecord, deleteGenericRecord, updateEntity, deleteEntity, createEntity };
