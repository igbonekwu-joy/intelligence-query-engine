const express = require('express');
const router = express.Router();
const { authorize } = require('../../middleware/authenticationHandler');
const upload = require('../../middleware/upload');
const { uploadCSV } = require('./ingestion.controller');

router.post('/import', authorize('analyst', 'admin'), upload.single('file'), uploadCSV);

module.exports = router;