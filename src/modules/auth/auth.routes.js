const express = require('express');
const { gitHubOAuth, gitHubCallback, refresh } = require('./auth.controller');
const asyncHandler = require('../../middleware/asyncHandler');
const router = express.Router();

router.get('/github', asyncHandler(gitHubOAuth));

router.get('/github/callback', asyncHandler(gitHubCallback));
 
router.post('/refresh', asyncHandler(refresh));

router.post('/logout', (req, res) => {});

module.exports = router; 