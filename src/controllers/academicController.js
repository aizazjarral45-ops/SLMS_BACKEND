const mongoose = require("mongoose");
const AcademicProfile = require("../models/AcademicProfile");
const Course = require("../models/Course");
const Exam = require("../models/Exam");
const Attendance = require("../models/Attendance");
const Assignment = require("../models/Assignment");
const StudentProfile = require("../models/StudentProfile");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

const profileFields = [
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
const academicFields = ["program", "semester", "cgpa", "department", "batch"];

const clean = (body, fields) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return fields.reduce((result, field) => {
    if (body[field] !== undefined) result[field] = body[field];
    return result;
  }, {});
};
const userFilter = (req) => ({ userId: req.user._id });

const getProfile = asyncHandler(async (req, res) => {
  const profile = await StudentProfile.findOne(userFilter(req));
  if (!profile) return errorResponse(res, "Profile not found", null, 404);
  return successResponse(res, "Student profile", { profile }, 200);
});

const updateProfile = asyncHandler(async (req, res) => {
  const update = clean(req.body, profileFields);
  if (!update || !Object.keys(update).length)
    return errorResponse(
      res,
      "At least one profile field is required",
      null,
      400,
    );
  const profile = await StudentProfile.findOneAndUpdate(
    userFilter(req),
    { $set: update, $setOnInsert: { userId: req.user._id } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  return successResponse(res, "Student profile updated", { profile }, 200);
});

const getAcademicProfile = asyncHandler(async (req, res) => {
  const profile = await AcademicProfile.findOne(userFilter(req));
  return successResponse(
    res,
    "Academic profile",
    { profile: profile || null },
    200,
  );
});

const updateAcademicProfile = asyncHandler(async (req, res) => {
  const update = clean(req.body, academicFields);
  if (!update || !Object.keys(update).length)
    return errorResponse(
      res,
      "At least one academic profile field is required",
      null,
      400,
    );
  const profile = await AcademicProfile.findOneAndUpdate(
    userFilter(req),
    { $set: update, $setOnInsert: { userId: req.user._id } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  return successResponse(res, "Academic profile saved", { profile }, 200);
});

const makeCrud = (
  Model,
  fields,
  label,
  required = [],
  singular = label.replace(/s$/, ""),
) => ({
  list: asyncHandler(async (req, res) => {
    const records = await Model.find(userFilter(req)).sort({ createdAt: -1 });
    return successResponse(res, label, { [label.toLowerCase()]: records }, 200);
  }),
  create: asyncHandler(async (req, res) => {
    const data = clean(req.body, fields);
    if (
      !data ||
      required.some(
        (field) =>
          data[field] === undefined ||
          data[field] === null ||
          (typeof data[field] === "string" && !data[field].trim()),
      )
    ) {
      return errorResponse(
        res,
        `${singular} required fields are missing`,
        null,
        400,
      );
    }
    const record = await Model.create({ ...data, userId: req.user._id });
    return successResponse(
      res,
      `${singular} created`,
      { [singular.toLowerCase()]: record },
      201,
    );
  }),
  update: asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id))
      return errorResponse(res, "Invalid record id", null, 400);
    const data = clean(req.body, fields);
    if (!data || !Object.keys(data).length)
      return errorResponse(res, "No valid fields supplied", null, 400);
    const record = await Model.findOneAndUpdate(
      { _id: req.params.id, ...userFilter(req) },
      { $set: data },
      { new: true, runValidators: true },
    );
    if (!record) return errorResponse(res, `${singular} not found`, null, 404);
    return successResponse(
      res,
      `${singular} updated`,
      { [singular.toLowerCase()]: record },
      200,
    );
  }),
  remove: asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id))
      return errorResponse(res, "Invalid record id", null, 400);
    const record = await Model.findOneAndDelete({
      _id: req.params.id,
      ...userFilter(req),
    });
    if (!record) return errorResponse(res, `${singular} not found`, null, 404);
    return successResponse(res, `${singular} deleted`, {}, 200);
  }),
});

const courses = makeCrud(
  Course,
  ["code", "title", "instructor", "credits"],
  "Courses",
  ["code", "title", "instructor", "credits"],
);
const exams = makeCrud(
  Exam,
  ["title", "course", "examDate", "venue"],
  "Exams",
  ["title", "course", "examDate", "venue"],
);
const attendance = makeCrud(
  Attendance,
  ["course", "attended", "total"],
  "Attendance",
  ["course", "attended", "total"],
  "Attendance",
);

const getAcademicRecord = asyncHandler(async (req, res) => {
  const [profile, courseRows, examRows, attendanceRows, assignments] =
    await Promise.all([
      AcademicProfile.findOne(userFilter(req)),
      Course.find(userFilter(req)).sort({ createdAt: -1 }),
      Exam.find(userFilter(req)).sort({ examDate: 1, createdAt: -1 }),
      Attendance.find(userFilter(req)).sort({ createdAt: -1 }),
      Assignment.find(userFilter(req)).sort({ dueDate: 1, createdAt: -1 }),
    ]);
  return successResponse(
    res,
    "Academic record",
    {
      profile: profile || null,
      courses: courseRows,
      exams: examRows,
      attendance: attendanceRows,
      assignments,
    },
    200,
  );
});

// Compatibility endpoint for clients that save the complete academic workspace.
const upsertAcademicRecord = asyncHandler(async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body))
    return errorResponse(res, "Academic data is required", null, 400);
  const profileData = clean(body.profile || body, academicFields);
  if (Object.keys(profileData).length) {
    await AcademicProfile.findOneAndUpdate(
      userFilter(req),
      { $set: profileData, $setOnInsert: { userId: req.user._id } },
      { upsert: true, runValidators: true },
    );
  }
  const collections = [
    [Course, body.courses, ["code", "title"]],
    [Exam, body.exams, ["title", "examDate"]],
    [Attendance, body.attendance, ["course"]],
  ];
  for (const [Model, values, fields] of collections) {
    if (!Array.isArray(values)) continue;
    const records = values.map((value) => ({
      ...clean(
        value,
        fields.concat(
          Model === Course
            ? ["instructor", "credits"]
            : Model === Exam
              ? ["course", "venue"]
              : ["attended", "total"],
        ),
      ),
      userId: req.user._id,
    }));
    await Model.deleteMany(userFilter(req));
    if (records.length) await Model.insertMany(records, { ordered: true });
  }
  return getAcademicRecord(req, res);
});

module.exports = {
  getAcademicRecord,
  upsertAcademicRecord,
  getAcademicProfile,
  updateAcademicProfile,
  getProfile,
  updateProfile,
  listCourses: courses.list,
  createCourse: courses.create,
  updateCourse: courses.update,
  deleteCourse: courses.remove,
  listExams: exams.list,
  createExam: exams.create,
  updateExam: exams.update,
  deleteExam: exams.remove,
  listAttendance: attendance.list,
  createAttendance: attendance.create,
  updateAttendance: attendance.update,
  deleteAttendance: attendance.remove,
};
