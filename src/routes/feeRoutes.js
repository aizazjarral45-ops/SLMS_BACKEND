const express = require('express');
const { listFees, createFee, updateFee, deleteFee } = require('../controllers/feeController');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.get('/', listFees);
router.post('/', authorize('student'), createFee);
router.put('/:id', authorize('student', 'admin', 'super_admin'), updateFee);
router.delete('/:id', authorize('student', 'admin', 'super_admin'), deleteFee);

module.exports = router;
