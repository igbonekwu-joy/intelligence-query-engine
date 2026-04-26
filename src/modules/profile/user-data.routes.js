const express = require('express');
const { storeUserData, fetchUserData, index, deleteUserData, search } = require('./user-data.controller');
const asyncHandler = require('../../middleware/asyncHandler');
const { StatusCodes } = require('http-status-codes');
const router = express.Router();

router.post('/api/profiles', asyncHandler(storeUserData));
router.get('/api/profiles', asyncHandler(index));
router.get('/api/profiles/search', asyncHandler(search));
router.get('/api/profiles/:id', asyncHandler(fetchUserData));
router.delete('/api/profiles/:id', asyncHandler(deleteUserData));

// router.get('/health', (req, res) => {
//     res.status(StatusCodes.OK).send('Server is up and running!');
// })


module.exports = router;