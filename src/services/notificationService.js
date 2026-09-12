const Notification = require('../models/Notification');
const User = require('../models/User');
const Preference = require('../models/Preference');
const Settings = require('../models/Settings');
const Expense = require('../models/Expense');
const Assignment = require('../models/Assignment');
const Exam = require('../models/Exam');
const Attendance = require('../models/Attendance');
const Hostel = require('../models/Hostel');
const HostelApplication = require('../models/HostelApplication');
const Fee = require('../models/Fee');
const StudentProfile = require('../models/StudentProfile');
const Reminder = require('../models/Reminder');
const { emitToUser, emitDataChange } = require('../config/socket');

const notificationSettingKey = ({ module = '', type = '' } = {}) => {
  const normalizedModule = String(module).toLowerCase();
  const normalizedType = String(type).toLowerCase();
  if (normalizedModule === 'expenses' || normalizedModule === 'expense' || normalizedType === 'expense') return 'expense';
  if (normalizedModule === 'complaints' || normalizedModule === 'complaint' || normalizedType === 'complaint') return 'complaints';
  if (normalizedModule === 'hostel' || normalizedModule === 'applications' || normalizedModule === 'application' || normalizedType === 'hostel') return 'hostel';
  if (['assignment', 'quiz', 'exam', 'attendance', 'reminder', 'ai'].includes(normalizedModule)) return normalizedModule;
  if (['assignment', 'quiz', 'exam', 'attendance', 'reminder', 'ai'].includes(normalizedType)) return normalizedType;
  return null;
};

async function isNotificationEnabled(recipientId, notification) {
  const settingKey = notificationSettingKey(notification);
  if (!settingKey) return true;
  const settings = await Settings.findOne({ userId: recipientId }).select('notifications').lean();
  return settings?.notifications?.[settingKey] !== false;
}

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
  severity = priority,
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
  const createdNotifications = [];
  for (const recipientId of recipientIds) {
    if (!(await isNotificationEnabled(recipientId, { module, type }))) continue;
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
      priority: severity,
      severity,
      isRead: false,
      read: false,
      ...(dedupeKey ? { dedupeKey } : {}),
    };
    if (!dedupeKey) {
      const notification = await Notification.create(payload);
      notifications.push(notification);
      createdNotifications.push(notification);
      continue;
    }
    try {
      const existing = await Notification.findOne({ recipientId, dedupeKey });
      if (existing) {
        notifications.push(existing);
      } else {
        const notification = await Notification.create(payload);
        notifications.push(notification);
        createdNotifications.push(notification);
      }
    } catch (error) {
      if (error?.code !== 11000) throw error;
      const duplicate = await Notification.findOne({ recipientId, dedupeKey });
      if (duplicate) notifications.push(duplicate);
      else throw error;
    }
  }

  createdNotifications.forEach((notification) => {
    const payload = {
      ...notification.toObject(),
      id: notification._id.toString(),
      _id: notification._id.toString(),
      read: notification.isRead,
    };
    emitToUser(notification.recipientId.toString(), 'notification:created', payload);
    emitDataChange({
      userId: notification.recipientId,
      resource: 'notifications',
      action: 'created',
      id: notification._id,
      record: payload,
    });
  });
  return notifications[0] || null;
}

const dateOnly = (value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

async function ensureBudgetNotifications(userId, preference = null) {
  const currentPreference = preference || await Preference.findOne({ userId }).lean();
  const settings = await Settings.findOne({ userId }).select('notifications.expense').lean();
  if (settings?.notifications?.expense === false) return;
  const budget = Number(currentPreference?.monthlyBudget || 0);
  if (budget <= 0) {
    if (currentPreference?.budgetAlertState) {
      await Preference.updateOne({
        userId,
      }, {
        $set: {
          budgetAlertState: {
            version: 2,
            period: new Date().toISOString().slice(0, 7),
            low: false,
            low25: false,
            strong: false,
            critical: false,
            exhausted: false,
            lowCycle: Number(currentPreference.budgetAlertState.lowCycle || 0),
            low25Cycle: Number(currentPreference.budgetAlertState.low25Cycle || 0),
            strongCycle: Number(currentPreference.budgetAlertState.strongCycle || 0),
            criticalCycle: Number(currentPreference.budgetAlertState.criticalCycle || 0),
            exhaustedCycle: Number(currentPreference.budgetAlertState.exhaustedCycle || 0),
          },
        },
      });
    }
    return;
  }

  const now = new Date();
  const period = now.toISOString().slice(0, 7);
  const expenses = await Expense.find({ userId }).select('amount date createdAt').lean();
  const spent = expenses.reduce((sum, item) => {
    const date = String(item.date || item.createdAt || '');
    return date.slice(0, 7) === period ? sum + Number(item.amount || 0) : sum;
  }, 0);
  const remainingRatio = (budget - spent) / budget;
  const remainingPercentage = Math.max(0, remainingRatio * 100);
  const remainingPercentageLabel = `${Number(remainingPercentage.toFixed(2))}%`;
  const exhausted = remainingRatio <= 0;
  const thresholds = [
    {
      key: 'low',
      active: remainingRatio <= 0.5 && remainingRatio > 0.25 && !exhausted,
      title: 'Budget Warning',
      priority: 'warning',
      message: `Your remaining budget is below 50%. Current remaining budget: ${remainingPercentageLabel}.`,
    },
    {
      key: 'low25',
      active: remainingRatio <= 0.25 && remainingRatio > 0.2 && !exhausted,
      title: 'Budget Running Low',
      priority: 'warning',
      message: `Your budget is running low. Your remaining budget is ${remainingPercentageLabel}.`,
    },
    {
      key: 'strong',
      active: remainingRatio <= 0.2 && remainingRatio > 0.15 && !exhausted,
      title: 'Budget Warning',
      priority: 'high',
      message: `Warning: Your remaining budget is ${remainingPercentageLabel}.`,
    },
    {
      key: 'critical',
      active: remainingRatio <= 0.15 && !exhausted,
      title: 'Critical Budget Alert',
      priority: 'critical',
      message: `Critical Alert: Your remaining budget is ${remainingPercentageLabel}.`,
    },
    {
      key: 'exhausted',
      active: exhausted,
      title: 'Budget exhausted',
      priority: 'critical',
      message: 'Your budget has been exhausted. You have no remaining budget.',
    },
  ];
  const previous = currentPreference?.budgetAlertState || {};
  const state = previous.version === 2 && previous.period === period
    ? { ...previous }
    : {
      version: 2,
      period,
      low: false,
      low25: false,
      strong: false,
      critical: false,
      exhausted: false,
      lowCycle: 0,
      low25Cycle: 0,
      strongCycle: 0,
      criticalCycle: 0,
      exhaustedCycle: 0,
    };

  for (const threshold of thresholds) {
    const wasActive = state[threshold.key] === true;
    if (threshold.active && !wasActive) {
      const cycleKey = `${threshold.key}Cycle`;
      state[cycleKey] = Number(state[cycleKey] || 0) + 1;
      await createNotification({
        userId,
        title: threshold.title,
        message: threshold.message,
        type: 'expense',
        module: 'expenses',
        navigationTarget: '/expense',
        priority: threshold.priority,
        severity: threshold.priority,
        dedupeKey: `budget:${period}:${threshold.key}:${state[cycleKey]}`,
      });
    }
    state[threshold.key] = threshold.active;
  }

  await Preference.updateOne({ userId }, { $set: { budgetAlertState: state } });
}

async function ensureDerivedNotifications(userId) {
  const now = new Date();
  const [preference, assignments, exams, attendance, hostels, hostelApplications, fees, profile, reminders] = await Promise.all([
    Preference.findOne({ userId }).lean(),
    Assignment.find({ userId }).select('title course dueDate status').lean(),
    Exam.find({ userId }).select('title course examDate').lean(),
    Attendance.find({ userId }).select('course attended total').lean(),
    Hostel.find({ userId }).select('feesStatus paymentDueDate feesPaidThisMonth').lean(),
    HostelApplication.find({ studentId: userId }).select('status createdAt updatedAt').lean(),
    Fee.find({ userId }).select('feeType status dueDate amount paidAmount').lean(),
    StudentProfile.findOne({ userId }).lean(),
    Reminder.find({ userId, done: false }).select('title type when').lean(),
  ]);

  await ensureBudgetNotifications(userId, preference);

  const dayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysUntil = (value) => {
    const date = dateOnly(value);
    return date ? Math.round((date.getTime() - dayStart) / 86400000) : null;
  };
  for (const assignment of assignments) {
    if (assignment.status === 'Completed') continue;
    const days = daysUntil(assignment.dueDate);
    if (![3, 1].includes(days)) continue;
    const wording = `due in ${days} days`;
    await createNotification({
      userId,
      title: `Assignment Due in ${days} Days`,
      message: `Your assignment "${assignment.title}" is ${wording}.`,
      type: 'assignment',
      module: 'assignments',
      relatedModel: 'Assignment',
      relatedId: assignment._id,
      navigationTarget: '/academic',
      dedupeKey: `assignment:${assignment._id}:${days}`,
    });
  }
  for (const exam of exams) {
    const days = daysUntil(exam.examDate);
    if (![7, 3, 2, 1].includes(days)) continue;
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
    const critical = percentage < 50;
    await createNotification({
      userId,
      title: critical ? 'Attendance Critical' : 'Attendance Warning',
      message: critical
        ? `Your attendance is ${percentage.toFixed(1)}%. You are at risk of dropout. Please maintain your attendance.`
        : `Your attendance is ${percentage.toFixed(1)}%.`,
      type: 'attendance',
      module: 'academic',
      navigationTarget: '/academic',
      priority: critical ? 'critical' : 'warning',
      dedupeKey: `attendance:${item._id}:${critical ? 'critical' : 'warning'}`,
    });
  }

  for (const application of hostelApplications) {
    if (!application.updatedAt || !application.createdAt || new Date(application.updatedAt).getTime() <= new Date(application.createdAt).getTime()) continue;
    await createNotification({
    userId, title: 'Hostel application updated',
    message: `Your hostel application status is now ${application.status}.`,
    type: 'hostel', module: 'hostel', relatedModel: 'HostelApplication', relatedId: application._id,
    navigationTarget: '/hostel', dedupeKey: `hostel-application:${application._id}:${application.status}:${new Date(application.updatedAt).getTime()}`,
    });
  }
  for (const hostel of hostels) {
    if (!hostel.feesStatus) continue;
    await createNotification({
    userId, title: `Hostel fee ${hostel.feesStatus.toLowerCase()}`,
    message: `Your hostel fee status is ${hostel.feesStatus}.`,
    type: 'fee', module: 'hostel', navigationTarget: '/hostel',
    priority: hostel.feesStatus === 'Overdue' ? 'critical' : 'warning',
    dedupeKey: `hostel-fee:${hostel._id}:${hostel.feesStatus}`,
    });
  }
  for (const fee of fees) {
    if (!fee.status) continue;
    await createNotification({
    userId, title: `Fee ${fee.status.toLowerCase()}`,
    message: `Your ${fee.feeType} fee status is ${fee.status}.`,
    type: 'fee', module: 'fees', navigationTarget: '/fees',
    priority: fee.status === 'Overdue' ? 'critical' : fee.status === 'Paid' ? 'normal' : 'warning',
    dedupeKey: `fee:${fee._id}:${fee.status}`,
    });
  }
  if (profile) {
    const required = ['fullName', 'studentId', 'universityEmail', 'phone', 'program', 'semester'];
    const missing = required.filter((field) => !String(profile[field] || '').trim());
    if (!missing.length) {
      await createNotification({
        userId,
        title: 'Profile completed',
        message: 'Congratulations! Your profile is completed.',
        type: 'profile',
        module: 'profile',
        navigationTarget: '/profile',
        dedupeKey: 'profile:completed',
      });
    }
  }
  for (const reminder of reminders) {
    const days = daysUntil(reminder.when);
    if (days === null || days > 1) continue;
    await createNotification({
    userId, title: days < 0 ? 'Reminder overdue' : 'Reminder due',
    message: `Reminder: ${reminder.title}${days === 0 ? ' is due today.' : days < 0 ? ' is overdue.' : ` is due in ${days} day${days === 1 ? '' : 's'}.`}`,
    type: 'reminder', module: 'reminders', navigationTarget: '/reminders',
    priority: days < 0 ? 'critical' : days === 0 ? 'warning' : 'normal',
    dedupeKey: `reminder:${reminder._id}:${days}`,
    });
  }
}

module.exports = {
  createNotification,
  ensureBudgetNotifications,
  ensureDerivedNotifications,
  isNotificationEnabled,
};
