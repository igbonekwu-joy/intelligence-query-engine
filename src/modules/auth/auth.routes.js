const express = require('express');
const { gitHubOAuth, gitHubCallback } = require('./auth.controller');
const router = express.Router();

router.get('/github', gitHubOAuth);

router.get('/github/callback', gitHubCallback);

router.post('/refresh', (req, res) => {});

router.post('/logout', (req, res) => {});

module.exports = router;