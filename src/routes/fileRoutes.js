const express = require('express');
const upload = require('../middleware/upload');
const { uploadFile, getFiles, downloadFile, deleteFile } = require('../controllers/fileController');

const router = express.Router();

router.get('/', getFiles);
router.post('/upload', upload.single('file'), uploadFile);
router.get('/:id/download', downloadFile);
router.delete('/:id', deleteFile);

module.exports = router;
