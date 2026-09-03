const express = require('express');
const { listReminders, getReminder, createReminder, updateReminder, toggleReminder, deleteReminder } = require('../controllers/reminderController');

const router = express.Router();

router.get('/', listReminders);
router.post('/', createReminder);
router.get('/:id', getReminder);
router.put('/:id', updateReminder);
router.patch('/:id', updateReminder);
router.patch('/:id/toggle', toggleReminder);
router.delete('/:id', deleteReminder);

module.exports = router;
