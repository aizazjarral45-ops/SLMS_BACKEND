const Notification = require('../models/Notification');
const User = require('../models/User');
const Preference = require('../models/Preference');
const Expense = require('../models/Expense');
const Assignment = require('../models/Assignment');
const Exam = require('../models/Exam');
const Attendance = require('../models/Attendance');
const { emitToUser } = require('../config/socket');

async function createNotification({
  userId,
  sourceUserId = null,
  title,
  message,
  type = 'general',
  module = 'system',
  relatedModel = '',
  relatedId = null,
  navigationTarget = '',
  priority = 'normal',
  dedupeKey = null,
  notifyAdmins = false,
}) {
  const inferredNavigationTarget = navigationTarget || ({
    complaints: '/complaints',
    complaint: '/complaints',
    expenses: '/expense',
    expense: '/expense',
    hostel: '/hostel',
    assignments: '/academic',
    assignment: '/academic',
    academic: '/academic',
    attendance: '/academic',
    applications: '/hostel',
    application: '/hostel',
  }[module] || '');
  const recipients = [];
  if (userId) recipients.push(userId);
  if (notifyAdmins) {
    const admins = await User.find({ role: { $in: ['admin', 'super_admin'] }, status: 'Active' }).select('_id').lean();
    admins.forEach((admin) => recipients.push(admin._id));
  }
  const recipientIds = [...new Set(recipients.filter(Boolean).map((id) => id.toString()))];
  const notifications = [];
  for (const recipientId of recipientIds) {
    const payload = {
      recipientId,
      senderId: sourceUserId,
      userId: recipientId,
      sourceUserId,
      title,
      message,
      type,
      module,
      relatedModel,
      relatedId,
      navigationTarget: inferredNavigationTarget,
      priority,
      isRead: false,
      read: false,
      ...(dedupeKey ? { dedupeKey } : {}),
    };
    if (!dedupeKey) {
      notifications.push(await Notification.create(payload));
      continue;
    }
    const existing = await Notification.findOne({ recipientId, dedupeKey });
    if (existing) {
      notifications.push(existing);
      continue;
    }
    try {
      notifications.push(await Notification.create(payload));
    } catch (error) {
      if (error?.code !== 11000) throw error;
      const duplicate = await Notification.findOne({ recipientId, dedupeKey });
      if (duplicate) notifications.push(duplicate);
      else throw error;
    }
  }

  notifications.forEach((notification) => emitToUser(notification.recipientId.toString(), 'new-notification', {
    id: notification._id.toString(),
    title,
    message,
    type,
    module,
    navigationTarget: inferredNavigationTarget,
    read: notification.isRead,
    createdAt: notification.createdAt,
  }));
  return notifications[0] || null;
}

const dateOnly = (value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

async function ensureDerivedNotifications(userId) {
  const now = new Date();
  const period = now.toISOString().slice(0, 7);
  const [preference, expenses, assignments, exams, attendance] = await Promise.all([
    Preference.findOne({ userId }).lean(),
    Expense.find({ userId }).select('amount').lean(),
    Assignment.find({ userId }).select('title course dueDate status').lean(),
    Exam.find({ userId }).select('title course examDate').lean(),
    Attendance.find({ userId }).select('course attended total').lean(),
  ]);

  const budget = Number(preference?.monthlyBudget || 0);
  const spent = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  if (budget > 0) {
    const remaining = budget - spent;
    const ratio = remaining / budget;
    const thresholds = ratio <= 0
      ? [['exhausted', 'Budget Exhausted']]
      : [
          ...(ratio <= 0.3 ? [['low', 'Low Budget Warning']] : []),
          ...(ratio <= 0.5 ? [['warning', 'Budget Warning']] : []),
        ];
    for (const [threshold, title] of thresholds) {
      await createNotification({
        userId,
        title,
        message: `Your remaining monthly budget is ${remaining.toFixed(2)}.`,
        type: 'expense',
        module: 'expenses',
        navigationTarget: '/expense',
        priority: threshold === 'exhausted' ? 'critical' : 'warning',
        dedupeKey: `budget:${period}:${threshold}`,
      });
    }
  }

  const dayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysUntil = (value) => {
    const date = dateOnly(value);
    return date ? Math.round((date.getTime() - dayStart) / 86400000) : null;
  };
  for (const assignment of assignments) {
    if (assignment.status === 'Completed') continue;
    const days = daysUntil(assignment.dueDate);
    if (![3, 2, 1, 0, -1].includes(days)) continue;
    const period = days < 0 ? 'overdue' : String(days);
    const wording = days < 0 ? 'overdue' : days === 0 ? 'due today' : `due in ${days} days`;
    await createNotification({
      userId,
      title: days < 0 ? 'Assignment Overdue' : `Assignment Due in ${days} Days`,
      message: `Your assignment "${assignment.title}" is ${wording}.`,
      type: 'assignment',
      module: 'assignments',
      relatedModel: 'Assignment',
      relatedId: assignment._id,
      navigationTarget: '/academic',
      dedupeKey: `assignment:${assignment._id}:${period}`,
    });
  }
  for (const exam of exams) {
    const days = daysUntil(exam.examDate);
    if (![7, 4, 3, 2, 1, 0].includes(days)) continue;
    await createNotification({
      userId,
      title: 'Exam Reminder',
      message: `Your ${exam.course || exam.title} exam is in ${days} days.`,
      type: 'exam',
      module: 'academic',
      relatedModel: 'Exam',
      relatedId: exam._id,
      navigationTarget: '/academic',
      dedupeKey: `exam:${exam._id}:${days}`,
    });
  }
  for (const item of attendance) {
    const total = Number(item.total || 0);
    if (!total) continue;
    const percentage = (Number(item.attended || 0) / total) * 100;
    if (percentage >= 75) continue;
    const critical = percentage < 50;
    await createNotification({
      userId,
      title: critical ? 'Attendance Critical' : 'Attendance Warning',
      message: critical
        ? `Your attendance is ${percentage.toFixed(1)}%. You are at risk according to the existing attendance rule.`
        : `Your attendance is ${percentage.toFixed(1)}%. Your attendance has fallen below the required 75%.`,
      type: 'attendance',
      module: 'academic',
      navigationTarget: '/academic',
      priority: critical ? 'critical' : 'warning',
      dedupeKey: `attendance:${item._id}:${critical ? 'critical' : 'warning'}`,
    });
  }
}

module.exports = { createNotification, ensureDerivedNotifications };
