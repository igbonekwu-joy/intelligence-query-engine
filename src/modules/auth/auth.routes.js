const express = require('express');
const { gitHubOAuth, gitHubCallback, refresh, logout, getUser } = require('./auth.controller');
const asyncHandler = require('../../middleware/asyncHandler');
const { authenticate } = require('../../middleware/authenticationHandler');
const router = express.Router();

router.get('/github', asyncHandler(gitHubOAuth));

router.get('/me', authenticate, asyncHandler(getUser));    

router.get('/github/callback', asyncHandler(gitHubCallback));
 
router.post('/refresh', asyncHandler(refresh));

router.post('/logout', asyncHandler(logout));

module.exports = router; 