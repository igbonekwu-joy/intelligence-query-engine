const express = require('express');
const { storeUserData, fetchUserData, index, deleteUserData } = require('./user-data.controller');
const asyncHandler = require('../middleware/asyncHandler');
const { StatusCodes } = require('http-status-codes');
const router = express.Router();

router.post('/api/profiles', asyncHandler(storeUserData));
router.get('/api/profiles/:id', asyncHandler(fetchUserData));
router.get('/api/profiles', asyncHandler(index));
router.delete('/api/profiles/:id', asyncHandler(deleteUserData));

// router.get('/health', (req, res) => {
//     res.status(StatusCodes.OK).send('Server is up and running!');
// })


module.exports = router;