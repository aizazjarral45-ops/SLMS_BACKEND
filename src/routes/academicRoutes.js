const express = require('express');
const {
  getAcademicRecord, upsertAcademicRecord, getAcademicProfile, updateAcademicProfile,
  listCourses, createCourse, updateCourse, deleteCourse,
  listExams, createExam, updateExam, deleteExam,
  listAttendance, createAttendance, updateAttendance, deleteAttendance,
} = require('../controllers/academicController');

const router = express.Router();

router.get('/', getAcademicRecord);
router.post('/', upsertAcademicRecord);
router.put('/', upsertAcademicRecord);
router.get('/profile', getAcademicProfile);
router.put('/profile', updateAcademicProfile);
router.post('/profile', updateAcademicProfile);

router.get('/courses', listCourses);
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.patch('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourse);

router.get('/exams', listExams);
router.post('/exams', createExam);
router.put('/exams/:id', updateExam);
router.patch('/exams/:id', updateExam);
router.delete('/exams/:id', deleteExam);

router.get('/attendance', listAttendance);
router.post('/attendance', createAttendance);
router.put('/attendance/:id', updateAttendance);
router.patch('/attendance/:id', updateAttendance);
router.delete('/attendance/:id', deleteAttendance);

module.exports = router;
