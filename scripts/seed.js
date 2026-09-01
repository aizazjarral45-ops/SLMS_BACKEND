require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDatabase = require('../src/config/db');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const Permission = require('../src/models/Permission');
const Notification = require('../src/models/Notification');
const Complaint = require('../src/models/Complaint');
const Request = require('../src/models/Request');

async function seed() {
  await connectDatabase();

  await Promise.all([
    User.deleteMany({}),
    Role.deleteMany({}),
    Permission.deleteMany({}),
    Notification.deleteMany({}),
    Complaint.deleteMany({}),
    Request.deleteMany({}),
  ]);

  const permissions = await Permission.insertMany([
    { code: 'view_dashboard', name: 'View dashboard', category: 'student' },
    { code: 'submit_requests', name: 'Submit requests', category: 'student' },
    { code: 'submit_complaints', name: 'Submit complaints', category: 'student' },
    { code: 'manage_students', name: 'Manage students', category: 'admin' },
    { code: 'manage_academics', name: 'Manage academics', category: 'admin' },
    { code: 'manage_hostel', name: 'Manage hostel', category: 'admin' },
    { code: 'approve_finance', name: 'Approve finance', category: 'admin' },
    { code: 'resolve_complaints', name: 'Resolve complaints', category: 'admin' },
  ]);

  const roles = await Role.insertMany([
    { name: 'Student', slug: 'student', permissions: ['view_dashboard', 'submit_requests', 'submit_complaints'], isDefault: true },
    { name: 'Admin', slug: 'admin', permissions: ['manage_students', 'manage_academics', 'manage_hostel', 'approve_finance', 'resolve_complaints'] },
    { name: 'Super Admin', slug: 'super_admin', permissions: ['manage_students', 'manage_academics', 'manage_hostel', 'approve_finance', 'resolve_complaints'] },
  ]);

  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  const studentPasswordHash = await bcrypt.hash('Student@123', 10);

  const admin = await User.create({
    name: 'System Admin',
    email: 'admin@slms.com',
    passwordHash: adminPasswordHash,
    role: 'admin',
    permissions: roles[1].permissions,
  });

  const superAdmin = await User.create({
    name: 'Super Administrator',
    email: 'superadmin@slms.com',
    passwordHash: adminPasswordHash,
    role: 'super_admin',
    permissions: roles[2].permissions,
  });

  const student = await User.create({
    name: 'Ali Student',
    email: 'student@slms.com',
    passwordHash: studentPasswordHash,
    role: 'student',
    permissions: roles[0].permissions,
  });

  await Notification.insertMany([
    { userId: student._id, title: 'Welcome', message: 'Welcome to the SLMS portal.', type: 'system', module: 'dashboard' },
    { userId: admin._id, title: 'New complaint', message: 'A student submitted a new complaint.', type: 'complaint', module: 'complaints', read: false },
  ]);

  await Complaint.insertMany([
    { userId: student._id, title: 'Hostel issue', category: 'Hostel', priority: 'Medium', description: 'Water supply problem in room 301.', department: 'Hostel Administration', status: 'Submitted' },
  ]);

  await Request.insertMany([
    { userId: student._id, title: 'Course registration', category: 'Academic', type: 'Academic', description: 'Need help adding elective course.', status: 'Submitted' },
  ]);

  console.log('Seed data created');
  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
