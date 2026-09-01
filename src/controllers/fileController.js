const fs = require('fs');
const path = require('path');
const UploadedFile = require('../models/UploadedFile');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return errorResponse(res, 'No file uploaded', null, 400);
  }

  const record = await UploadedFile.create({
    userId: req.user._id,
    originalName: req.file.originalname,
    filename: req.file.filename,
    path: req.file.path,
    mimeType: req.file.mimetype,
    size: req.file.size,
    relatedType: req.body.relatedType || 'general',
    relatedId: req.body.relatedId || null,
  });

  return successResponse(res, 'File uploaded', { file: record }, 201);
});

const getFiles = asyncHandler(async (req, res) => {
  const files = await UploadedFile.find({ userId: req.user._id }).sort({ createdAt: -1 });
  return successResponse(res, 'Files', { files }, 200);
});

const downloadFile = asyncHandler(async (req, res) => {
  const file = await UploadedFile.findOne({ _id: req.params.id, userId: req.user._id });
  if (!file) return errorResponse(res, 'File not found', null, 404);

  const filePath = path.resolve(file.path);
  if (!fs.existsSync(filePath)) return errorResponse(res, 'File is missing on disk', null, 404);

  res.download(filePath, file.originalName);
});

const deleteFile = asyncHandler(async (req, res) => {
  const file = await UploadedFile.findOne({ _id: req.params.id, userId: req.user._id });
  if (!file) return errorResponse(res, 'File not found', null, 404);

  fs.existsSync(file.path) && fs.unlinkSync(file.path);
  await UploadedFile.deleteOne({ _id: file._id });
  return successResponse(res, 'File deleted', {}, 200);
});

module.exports = { uploadFile, getFiles, downloadFile, deleteFile };
