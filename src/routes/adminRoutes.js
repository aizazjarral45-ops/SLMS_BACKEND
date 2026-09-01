const express = require('express');
const { getDashboard, listRoles, listPermissions, getAuditLogs, getUsersForAdmin } = require('../controllers/adminController');
const { getWorkspace, saveGenericRecord, deleteGenericRecord, updateEntity, deleteEntity } = require('../controllers/workspaceController');
const { authorize } = require('../middleware/authorize');

const router = express.Router();
router.use(authorize('admin', 'super_admin'));
router.get('/dashboard', getDashboard);
router.get('/workspace', getWorkspace);
router.put('/workspace/:scope/:id', (req, _res, next) => { req.body.record = { ...(req.body.record || req.body), id: req.params.id }; next(); }, saveGenericRecord);
router.delete('/workspace/:scope/:id', deleteGenericRecord);
router.patch('/entities/:entity/:id', updateEntity);
router.delete('/entities/:entity/:id', deleteEntity);
router.get('/users', getUsersForAdmin);
router.get('/roles', listRoles);
router.get('/permissions', listPermissions);
router.get('/audit-logs', getAuditLogs);
module.exports = router;
