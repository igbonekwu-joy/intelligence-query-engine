const express = require('express');
const router = express.Router();

router.get('/github', (req, res) => {});

router.get('/github/callback', (req, res) => {});

router.post('/refresh', (req, res) => {});

router.post('/logout', (req, res) => {});

module.exports = router;