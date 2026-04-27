const express = require('express');
const { storeUserData, fetchUserData, index, deleteUserData, search, exportProfiles } = require('./user-data.controller');
const asyncHandler = require('../../middleware/asyncHandler');
const { authorize } = require('../../middleware/authenticationHandler');
const router = express.Router();

router.get('', authorize('admin', 'analyst'), asyncHandler(index));
router.get('/search', authorize('admin', 'analyst'), asyncHandler(search));
router.get('/export', authorize('admin', 'analyst'), asyncHandler(exportProfiles));
router.get('/:id', authorize('admin', 'analyst'), asyncHandler(fetchUserData));
router.post('', authorize('admin'), asyncHandler(storeUserData));
router.delete('/:id', authorize('admin'), asyncHandler(deleteUserData));


module.exports = router;