const Admin = require('../models/Admin');

async function ensureAdminAccount() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn('Admin account bootstrap skipped: ADMIN_EMAIL and ADMIN_PASSWORD are not configured.');
    return null;
  }

  const existingAdmin = await Admin.findOne({ email }).select('_id email role');
  if (existingAdmin) {
    return existingAdmin;
  }

  try {
    return await Admin.create({ email, password, role: 'admin' });
  } catch (error) {
    if (error.code === 11000) {
      return Admin.findOne({ email }).select('_id email role');
    }
    throw error;
  }
}

module.exports = { ensureAdminAccount };
