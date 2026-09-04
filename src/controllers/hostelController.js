const Hostel = require('../models/Hostel');
const HostelApplication = require('../models/HostelApplication');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification } = require('../services/notificationService');
const { recordStatusChange } = require('../services/statusService');
const { isValidObjectId } = require('../utils/objectId');

const studentInformationFields = ['fullName', 'studentId', 'email', 'phone', 'program', 'semester', 'gender'];
const guardianInformationFields = ['guardianName', 'guardianPhone', 'emergencyName', 'emergencyPhone'];

const pickFields = (source, fields) => fields.reduce((result, field) => {
  if (source[field] !== undefined) result[field] = source[field];
  return result;
}, {});

const structuredApplicationData = (details) => ({
  studentInformation: pickFields(details, studentInformationFields),
  guardianInformation: pickFields(details, guardianInformationFields),
});

const submitHostelApplication = asyncHandler(async (req, res) => {
  const applicantDetails = req.body?.applicantDetails || req.body;
  if (!applicantDetails || typeof applicantDetails !== 'object' || Array.isArray(applicantDetails)) {
    return errorResponse(res, 'Applicant details are required', null, 400);
  }
  const existingApplication = await HostelApplication.findOne({ studentId: req.user._id }).select('_id');
  if (existingApplication) {
    return errorResponse(res, 'A hostel application already exists. Edit the existing application instead.', null, 409);
  }

  const application = await HostelApplication.create({
    studentId: req.user._id,
    applicantDetails,
    ...structuredApplicationData(applicantDetails),
    status: 'Pending',
  });

  await createNotification({
    userId: req.user._id,
    sourceUserId: req.user._id,
    title: 'Hostel Application Submitted',
    message: 'Your hostel application has been submitted for review.',
    type: 'hostel',
    module: 'hostel',
    relatedModel: 'HostelApplication',
    relatedId: application._id,
    navigationTarget: '/hostel',
    dedupeKey: `hostel:${application._id}:submitted`,
    notifyAdmins: true,
  });

  return successResponse(res, 'Hostel application submitted', { application }, 201);
});

const updateHostelApplication = asyncHandler(async (req, res) => {
  const { applicantDetails, status, roomAllocation, roomNumber, block, floor } = req.body || {};
  const applicationId = req.params.id || req.body?.id;

  if (!applicationId) {
    return errorResponse(res, 'Hostel application id is required', null, 400);
  }
  if (!isValidObjectId(applicationId)) return errorResponse(res, 'Hostel application not found', null, 404);

  const application = await HostelApplication.findOne({
    _id: applicationId,
    studentId: req.user._id,
  });

  if (!application) {
    return errorResponse(res, 'Hostel application not found', null, 404);
  }

  if (applicantDetails && typeof applicantDetails === 'object' && !Array.isArray(applicantDetails)) {
    application.applicantDetails = {
      ...(application.applicantDetails || {}),
      ...applicantDetails,
    };
    Object.assign(application, structuredApplicationData(application.applicantDetails));
    application.markModified('applicantDetails');
    application.markModified('studentInformation');
    application.markModified('guardianInformation');
  }

  if (status && ['Pending', 'Approved', 'Rejected'].includes(status) && ['admin', 'super_admin'].includes(req.user.role)) {
    application.status = status;
  } else if (!status || req.user.role === 'student') {
    application.status = application.status === 'Approved' || application.status === 'Rejected'
      ? application.status
      : 'Pending';
  }

  const normalizedAllocation = roomAllocation && typeof roomAllocation === 'object'
    ? roomAllocation
    : { roomNumber, block, floor, allocatedAt: new Date() };

  if (normalizedAllocation && (normalizedAllocation.roomNumber || normalizedAllocation.block || normalizedAllocation.floor)) {
    application.roomAllocation = {
      roomNumber: String(normalizedAllocation.roomNumber || '').trim(),
      block: String(normalizedAllocation.block || '').trim(),
      floor: String(normalizedAllocation.floor || '').trim(),
      allocatedAt: normalizedAllocation.allocatedAt || new Date(),
    };
  }

  if (application.status === 'Approved' && (!application.roomAllocation?.roomNumber || !application.roomAllocation?.block || !application.roomAllocation?.floor)) {
    return errorResponse(res, 'Room number, block and floor are required for approval', null, 400);
  }

  await application.save();

  return successResponse(res, 'Hostel application updated', { application }, 200);
});

const getMyHostelApplication = asyncHandler(async (req, res) => {
  const application = await HostelApplication.findOne({ studentId: req.user._id })
    .sort({ createdAt: -1 })
    .populate('studentId', 'name email profile');
  return successResponse(res, 'Hostel application', { application }, 200);
});

const getAllHostelApplications = asyncHandler(async (_req, res) => {
  const applications = await HostelApplication.find()
    .sort({ createdAt: -1 })
    .populate('studentId', 'name email profile');
  return successResponse(res, 'Hostel applications', { applications }, 200);
});

const updateHostelApplicationStatus = asyncHandler(async (req, res) => {
  const { status, roomNumber, block, floor } = req.body || {};
  if (!['Approved', 'Rejected'].includes(status)) {
    return errorResponse(res, 'Status must be Approved or Rejected', null, 400);
  }
  if (status === 'Approved' && (!String(roomNumber || '').trim() || !String(block || '').trim() || !String(floor || '').trim())) {
    return errorResponse(res, 'Room number, block and floor are required for approval', null, 400);
  }
  if (!isValidObjectId(req.params.id)) return errorResponse(res, 'Hostel application not found', null, 404);

  const application = await HostelApplication.findById(req.params.id);
  if (!application) return errorResponse(res, 'Hostel application not found', null, 404);

  application.status = status;
  application.roomAllocation = status === 'Approved'
    ? { roomNumber: String(roomNumber).trim(), block: String(block).trim(), floor: String(floor).trim(), allocatedAt: new Date() }
    : { roomNumber: '', block: '', floor: '', allocatedAt: null };
  await application.save();

  await createNotification({
    userId: application.studentId,
    sourceUserId: req.user._id,
    title: `Hostel application ${status.toLowerCase()}`,
    message: status === 'Approved'
      ? `Your hostel application was approved. Room ${application.roomAllocation.roomNumber}, ${application.roomAllocation.block}, floor ${application.roomAllocation.floor}.`
      : 'Your hostel application was rejected.',
    type: 'hostel',
    module: 'hostel',
    relatedModel: 'HostelApplication',
    relatedId: application._id,
    navigationTarget: '/hostel',
    dedupeKey: `hostel:${application._id}:${status}`,
  });

  return successResponse(res, 'Hostel application status updated', { application }, 200);
});

const studentFields = ['applicationNo', 'fullName', 'studentId', 'email', 'phone', 'gender', 'program', 'semester', 'guardianName', 'guardianPhone', 'emergencyName', 'emergencyPhone', 'roomType', 'preference', 'facility', 'remarks'];
const adminFields = [...studentFields, 'roomId', 'block', 'capacity', 'occupied', 'status', 'feesPerSemester', 'feesPaidThisMonth', 'paymentDueDate', 'feesStatus', 'checkInDate'];
const copyFields = (target, body, fields) => fields.forEach((field) => { if (body[field] !== undefined) target[field] = body[field]; });

const listHostelRecords = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'student' ? { userId: req.user._id } : {};
  const records = await Hostel.find(filter).sort({ createdAt: -1 });
  return successResponse(res, 'Hostel records', { records }, 200);
});
const createHostelRecord = asyncHandler(async (req, res) => {
  let ownerId = req.user._id;
  if (req.user.role !== 'student' && req.body.userId) ownerId = req.body.userId;
  const owner = await User.findById(ownerId).select('name email profile');
  if (!owner) return errorResponse(res, 'Student account not found', null, 404);
  if (req.user.role === 'student' && (!req.body.fullName || !req.body.email || !req.body.studentId)) return errorResponse(res, 'Full name, student ID and email are required', null, 400);
  const record = new Hostel({ userId: ownerId, applicationNo: req.body.applicationNo || `HST-${Date.now().toString().slice(-8)}`, fullName: req.body.fullName || owner.name, email: req.body.email || owner.email, studentId: req.body.studentId || owner.profile?.studentId || '' });
  copyFields(record, req.body, req.user.role === 'student' ? studentFields : adminFields);
  if (!record.status) record.status = 'Pending';
  await record.save();
  await createNotification({ userId: ownerId, sourceUserId: req.user._id, title: req.user.role === 'student' ? 'Hostel application submitted' : 'Hostel application created', message: req.user.role === 'student' ? 'Your hostel application has been submitted for review.' : 'An administrator created a hostel application for you.', type: 'hostel', module: 'hostel', relatedModel: 'Hostel', relatedId: record._id, notifyAdmins: req.user.role === 'student' });
  return successResponse(res, 'Hostel record created', { record }, 201);
});
const updateHostelRecord = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return errorResponse(res, 'Hostel record not found', null, 404);
  const record = await Hostel.findById(req.params.id);
  if (!record) return errorResponse(res, 'Hostel record not found', null, 404);
  if (req.user.role === 'student' && String(record.userId) !== String(req.user._id)) return errorResponse(res, 'Forbidden', null, 403);
  const previousStatus = record.status;
  copyFields(record, req.body, req.user.role === 'student' ? studentFields : adminFields);
  await record.save();
  if (req.user.role !== 'student') {
    if (previousStatus !== record.status) await recordStatusChange({ entityType: 'Hostel', entityId: record._id, previousStatus, newStatus: record.status, changedBy: req.user._id, changedByRole: req.user.role, reason: req.body.reason || 'Hostel application updated', comment: req.body.remarks || '' });
    await createNotification({ userId: record.userId, sourceUserId: req.user._id, title: 'Hostel application updated', message: `Your hostel application status is now ${record.status}.`, type: 'hostel', module: 'hostel', relatedModel: 'Hostel', relatedId: record._id });
  }
  return successResponse(res, 'Hostel record updated', { record }, 200);
});
const deleteHostelRecord = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return errorResponse(res, 'Hostel record not found', null, 404);
  const record = await Hostel.findById(req.params.id);
  if (!record) return errorResponse(res, 'Hostel record not found', null, 404);
  if (req.user.role === 'student' && String(record.userId) !== String(req.user._id)) return errorResponse(res, 'Forbidden', null, 403);
  if (req.user.role === 'student' && record.status !== 'Pending') {
    return errorResponse(res, 'Only pending hostel applications can be deleted', null, 409);
  }
  await record.deleteOne();
  if (req.user.role !== 'student') await createNotification({ userId: record.userId, sourceUserId: req.user._id, title: 'Hostel application removed', message: 'An administrator removed your hostel application.', type: 'hostel', module: 'hostel' });
  return successResponse(res, 'Hostel record deleted', {}, 200);
});

module.exports = {
  listHostelRecords,
  createHostelRecord,
  updateHostelRecord,
  deleteHostelRecord,
  submitHostelApplication,
  updateHostelApplication,
  getMyHostelApplication,
  getAllHostelApplications,
  updateHostelApplicationStatus,
};
