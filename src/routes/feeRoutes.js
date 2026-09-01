const express = require('express');
const { listFees, createFee, updateFee } = require('../controllers/feeController');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.get('/', listFees);
router.post('/', authorize('student'), createFee);
router.put('/:id', updateFee);

module.exports = router;
