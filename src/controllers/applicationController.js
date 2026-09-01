const Application = require('../models/Application');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification } = require('../services/notificationService');

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
    notifyAdmins: true,
  });
  return successResponse(res, 'Application created', { application }, 201);
});

const updateApplication = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) return errorResponse(res, 'Application not found', null, 404);
  if (req.user.role === 'student' && String(application.userId) !== String(req.user._id)) return errorResponse(res, 'Forbidden', null, 403);

  const fields = req.user.role === 'student'
    ? ['fullName', 'email', 'phone', 'gender', 'program', 'semester', 'guardianName', 'guardianPhone', 'emergencyName', 'emergencyPhone']
    : ['fullName', 'email', 'phone', 'gender', 'program', 'semester', 'guardianName', 'guardianPhone', 'emergencyName', 'emergencyPhone', 'status'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) application[field] = req.body[field];
  });
  await application.save();
  return successResponse(res, 'Application updated', { application }, 200);
});

module.exports = { listApplications, createApplication, updateApplication };
