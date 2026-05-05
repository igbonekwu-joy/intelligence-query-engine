// Stores uploaded CSV to disk (not memory) so large files don't consume API memory

const multer = require('multer');
const path = require('path');
const os = require('os');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Use system temp dir — cleaned up after processing
        cb(null, os.tmpdir());
    },
    filename: (req, file, cb) => {
        // Unique filename to support concurrent uploads
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        cb(null, `insighta-upload-${unique}.csv`);
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;

    if (ext === '.csv' || mime === 'text/csv' || mime === 'application/csv' || mime === 'application/vnd.ms-excel') {
        cb(null, true);
    } else {
        cb(new Error('Only CSV files are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB max — 500k rows × ~1KB per row
    }
});

module.exports = upload;