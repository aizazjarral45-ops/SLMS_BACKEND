const Application = require('../models/Application');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification } = require('../services/notificationService');
const { isValidObjectId } = require('../utils/objectId');

const listApplications = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'student' ? { userId: req.user._id } : {};
  const applications = await Application.find(filter).sort({ createdAt: -1 });
  return successResponse(res, 'Applications', { applications }, 200);
});

const createApplication = asyncHandler(async (req, res) => {
  const application = await Application.create({
    userId: req.user._id,
    fullName: req.body.fullName || req.user.name,
    email: req.body.email || req.user.email,
    phone: req.body.phone || '',
    gender: req.body.gender || '',
    program: req.body.program || '',
    semester: req.body.semester || '',
    guardianName: req.body.guardianName || '',
    guardianPhone: req.body.guardianPhone || '',
    emergencyName: req.body.emergencyName || '',
    emergencyPhone: req.body.emergencyPhone || '',
    status: 'Submitted',
  });
  await createNotification({
    userId: req.user._id,
    title: 'New application submitted',
    message: 'Your application has been submitted for review.',
    type: 'application',
    module: 'applications',
    relatedModel: 'Application',
    relatedId: application._id,
    navigationTarget: '/hostel',
    dedupeKey: `application:${application._id}:submitted`,
    notifyAdmins: true,
  });
  return successResponse(res, 'Application created', { application }, 201);
});

const updateApplication = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return errorResponse(res, 'Application not found', null, 404);
  const application = await Application.findById(req.params.id);
  if (!application) return errorResponse(res, 'Application not found', null, 404);
  if (req.user.role === 'student' && String(application.userId) !== String(req.user._id)) return errorResponse(res, 'Forbidden', null, 403);

  const fields = req.user.role === 'student'
    ? ['fullName', 'email', 'phone', 'gender', 'program', 'semester', 'guardianName', 'guardianPhone', 'emergencyName', 'emergencyPhone']
    : ['fullName', 'email', 'phone', 'gender', 'program', 'semester', 'guardianName', 'guardianPhone', 'emergencyName', 'emergencyPhone', 'status'];
  const previousStatus = application.status;
  fields.forEach((field) => {
    if (req.body[field] !== undefined) application[field] = req.body[field];
  });
  await application.save();
  if (previousStatus !== application.status) {
    await createNotification({
      userId: application.userId,
      sourceUserId: req.user._id,
      title: `Application ${application.status}`,
      message: `Your application status is now ${application.status}.`,
      type: 'application',
      module: 'applications',
      relatedModel: 'Application',
      relatedId: application._id,
      navigationTarget: '/hostel',
      dedupeKey: `application:${application._id}:${application.status}`,
    });
  }
  return successResponse(res, 'Application updated', { application }, 200);
});

module.exports = { listApplications, createApplication, updateApplication };
