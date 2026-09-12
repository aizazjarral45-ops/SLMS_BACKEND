const StudentProfile = require("../models/StudentProfile");
const AcademicProfile = require("../models/AcademicProfile");
const Course = require("../models/Course");
const Exam = require("../models/Exam");
const Attendance = require("../models/Attendance");
const Complaint = require("../models/Complaint");
const Request = require("../models/Request");
const Expense = require("../models/Expense");
const Application = require("../models/Application");
const Hostel = require("../models/Hostel");
const Fee = require("../models/Fee");
const Assignment = require("../models/Assignment");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

const PROFILE_FIELDS = [
  "studentId",
  "fullName",
  "fatherName",
  "gender",
  "dob",
  "cnic",
  "bloodGroup",
  "nationality",
  "maritalStatus",
  "universityEmail",
  "personalEmail",
  "phone",
  "emergencyContact",
  "currentAddress",
  "permanentAddress",
  "profileImage",
  "program",
  "semester",
  "batch",
  "cgpa",
  "department",
  "sessions",
  "rollNo",
];

const PROFILE_COMPLETION_FIELDS = [
  "studentId",
  "rollNo",
  "department",
  "fullName",
  "fatherName",
  "gender",
  "phone",
  "nationality",
  "universityEmail",
  "personalEmail",
];

const isValidRequiredProfileValue = (field, value) => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return false;
  }
  if (field === "universityEmail" || field === "personalEmail") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
  }
  return true;
};

const isProfileCompleted = (profile) =>
  Boolean(
    profile &&
      PROFILE_COMPLETION_FIELDS.every((field) => {
        return isValidRequiredProfileValue(field, profile[field]);
      }),
  );

const getStudentDashboard = asyncHandler(async (req, res) => {
  const profile = await StudentProfile.findOne({ userId: req.userId });
  const [academicProfile, courses, exams, attendance] = await Promise.all([
    AcademicProfile.findOne({ userId: req.userId }),
    Course.find({ userId: req.userId }).sort({ createdAt: -1 }),
    Exam.find({ userId: req.userId }).sort({ examDate: 1, createdAt: -1 }),
    Attendance.find({ userId: req.userId }).sort({ createdAt: -1 }),
  ]);
  const complaints = await Complaint.find({ userId: req.userId })
    .sort({ createdAt: -1 })
    .limit(10);
  const requests = await Request.find({ userId: req.userId })
    .sort({ createdAt: -1 })
    .limit(10);
  const expenses = await Expense.find({ userId: req.userId })
    .sort({ createdAt: -1 })
    .limit(10);
  const hostel = await Hostel.find({ userId: req.userId }).sort({
    createdAt: -1,
  });
  const assignments = await Assignment.find({ userId: req.userId }).sort({
    dueDate: 1,
    createdAt: -1,
  });
  const fees = await Fee.find({ userId: req.userId })
    .sort({ createdAt: -1 })
    .limit(10);

  return successResponse(
    res,
    "Student dashboard data",
    {
      profile,
      academic: {
        profile: academicProfile || null,
        courses,
        exams,
        attendance,
        assignments,
      },
      complaints,
      requests,
      expenses,
      hostel,
      assignments,
      fees,
    },
    200,
  );
});

const getStudentProfile = asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store");
  const profile = await StudentProfile.findOne({ userId: req.userId });
  return successResponse(
    res,
    "Student profile",
    { profile: profile || null, profileCompleted: isProfileCompleted(profile) },
    200,
  );
});

const updateStudentProfile = asyncHandler(async (req, res) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return errorResponse(res, "A profile object is required", null, 400);
  }
  const profileData =
    req.body.profileData &&
    typeof req.body.profileData === "object" &&
    !Array.isArray(req.body.profileData)
      ? req.body.profileData
      : {};
  const payload = { ...profileData, ...req.body };
  const update = PROFILE_FIELDS.reduce((result, field) => {
    if (payload[field] !== undefined) result[field] = payload[field];
    return result;
  }, {});
  if (!Object.keys(update).length)
    return errorResponse(
      res,
      "At least one profile field is required",
      null,
      400,
    );
  const updated = await StudentProfile.findOneAndUpdate(
    { userId: req.userId },
    {
      $set: update,
      $unset: { CGP: 1 },
      $setOnInsert: { userId: req.userId },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  return successResponse(
    res,
    "Student profile updated",
    { profile: updated, profileCompleted: isProfileCompleted(updated) },
    200,
  );
});

const listStudents = asyncHandler(async (req, res) => {
  const students = await StudentProfile.find({}).sort({ createdAt: -1 });
  return successResponse(res, "Students", { students }, 200);
});

const getStudentById = asyncHandler(async (req, res) => {
  const student = await StudentProfile.findOne({ userId: req.params.id });
  if (!student) return errorResponse(res, "Student not found", null, 404);
  return successResponse(res, "Student", { student }, 200);
});

module.exports = {
  getStudentDashboard,
  getStudentProfile,
  updateStudentProfile,
  listStudents,
  getStudentById,
};
