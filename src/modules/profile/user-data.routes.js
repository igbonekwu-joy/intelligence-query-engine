const express = require('express');
const { storeUserData, fetchUserData, index, deleteUserData, search } = require('./user-data.controller');
const asyncHandler = require('../../middleware/asyncHandler');
const { StatusCodes } = require('http-status-codes');
const router = express.Router();

router.post('', asyncHandler(storeUserData));
router.get('', asyncHandler(index));
router.get('/search', asyncHandler(search));
router.get('/:id', asyncHandler(fetchUserData));
router.delete('/:id', asyncHandler(deleteUserData));

// router.get('/health', (req, res) => {
//     res.status(StatusCodes.OK).send('Server is up and running!');
// })


module.exports = router;