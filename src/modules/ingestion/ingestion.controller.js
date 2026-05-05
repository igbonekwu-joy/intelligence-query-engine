// Handles CSV uploads of up to 500,000 rows.
//
// Key design decisions:
// 1. STREAMING — file is never fully loaded into memory. It is piped
//    through a CSV parser row by row.
// 2. CHUNKING — rows are collected into batches of 500 and inserted
//    using a single multi-row INSERT per batch. This is 100x faster
//    than one INSERT per row.
// 3. NON-BLOCKING — multer stores the file on disk (not memory),
//    so the upload doesn't consume API memory while queries are running.
// 4. NO ROLLBACK — if processing fails midway, already-inserted rows
//    stay. Each chunk is its own transaction.
// 5. CONCURRENT SAFE — each upload runs independently. Multiple uploads
//    can run at the same time without interfering.

const fs = require('fs');
const path = require('path');
const { Transform } = require('stream');
const { parse } = require('csv-parse');
const { uuidv7 } = require('uuidv7');
const { StatusCodes } = require('http-status-codes');
const winston = require('winston');
const pool = require('../../config/database');
const { cacheFlushPattern } = require('../../utils/cache');
const { getAgeGroup } = require('../profile/user-data.service');

const CHUNK_SIZE = 500; // rows per INSERT batch

const VALID_GENDERS = ['male', 'female'];
const VALID_AGE_GROUPS = ['child', 'teenager', 'adult', 'senior'];
const REQUIRED_FIELDS = ['name', 'gender', 'age', 'country_id'];

// Expected CSV columns (order doesn't matter — we use headers)
// name, gender, gender_probability, age, age_group,
// country_id, country_name, country_probability, 

/**
 * Validate a single row. Returns { valid: bool, reason: string|null }
 */
const validateRow = (row) => {
    // Check required fields exist and are non-empty
    for (const field of REQUIRED_FIELDS) {
        if (!row[field] || String(row[field]).trim() === '') {
            return { valid: false, reason: 'missing_fields' };
        }
    }

    // Validate gender
    const gender = String(row.gender).toLowerCase().trim();
    if (!VALID_GENDERS.includes(gender)) {
        return { valid: false, reason: 'invalid_gender' };
    }

    // Validate age — must be a positive integer
    const age = parseInt(row.age, 10);
    if (isNaN(age) || age < 0 || age > 150) {
        return { valid: false, reason: 'invalid_age' };
    }

    // Validate country_id — must be a 2-letter code
    const countryId = String(row.country_id).toUpperCase().trim();
    if (!/^[A-Z]{2}$/.test(countryId)) {
        return { valid: false, reason: 'invalid_country' };
    }

    // Validate probabilities if present
    if (row.gender_probability !== undefined && row.gender_probability !== '') {
        const gp = parseFloat(row.gender_probability);
        if (isNaN(gp) || gp < 0 || gp > 1) {
            return { valid: false, reason: 'invalid_gender_probability' };
        }
    }

    if (row.country_probability !== undefined && row.country_probability !== '') {
        const cp = parseFloat(row.country_probability);
        if (isNaN(cp) || cp < 0 || cp > 1) {
            return { valid: false, reason: 'invalid_country_probability' };
        }
    }

    // Validate age_group if present
    if (row.age_group && row.age_group.trim() !== '') {
        const ag = String(row.age_group).toLowerCase().trim();
        if (!VALID_AGE_GROUPS.includes(ag)) {
            return { valid: false, reason: 'invalid_age_group' };
        }
    }

    return { valid: true, reason: null };
};

/**
 * Insert a chunk of validated rows using a single multi-row INSERT.
 * Uses ON CONFLICT (name) DO NOTHING for duplicate handling.
 * Returns { inserted, duplicates }
 */
const insertChunk = async (rows) => {
    if (rows.length === 0) return { inserted: 0, duplicates: 0 };

    // Build: INSERT INTO profiles (col1, col2, ...) VALUES ($1,$2,...), ($n,$n+1,...) ...
    const columns = [
        'id', 'name', 'gender', 'gender_probability',
        'age', 'age_group', 'country_id', 'country_name', 'country_probability'
    ];

    const colCount = columns.length;
    const valuePlaceholders = rows.map((_, rowIndex) =>
        `(${columns.map((_, colIndex) => `$${rowIndex * colCount + colIndex + 1}`).join(', ')})`
    ).join(', ');

    const values = rows.flatMap(row => [
        uuidv7(),
        String(row.name).trim().toLowerCase(),
        String(row.gender).toLowerCase().trim(),
        row.gender_probability ? parseFloat(row.gender_probability) : null,
        parseInt(row.age, 10),
        row.age_group
            ? String(row.age_group).toLowerCase().trim()
            : getAgeGroup(parseInt(row.age, 10)),
        String(row.country_id).toUpperCase().trim(),
        row.country_name ? String(row.country_name).trim() : null,
        row.country_probability ? parseFloat(row.country_probability) : null
    ]);

    const query = `
        INSERT INTO profiles (${columns.join(', ')})
        VALUES ${valuePlaceholders}
        ON CONFLICT (name) DO NOTHING
    `;

    const result = await pool.query(query, values);

    // rowCount = actually inserted rows (duplicates are silently skipped)
    const inserted = result.rowCount;
    const duplicates = rows.length - inserted;

    return { inserted, duplicates };
};

/**
 * Main ingestion controller
 */
const uploadCSV = async (req, res, next) => {
    if (!req.file) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: 'error',
            message: 'No file uploaded. Use multipart/form-data with field name "file".'
        });
    }

    const filePath = req.file.path;

    // Stats tracked throughout the stream
    const stats = {
        total_rows: 0,
        inserted: 0,
        skipped: 0,
        reasons: {}
    };

    const trackSkip = (reason) => {
        stats.skipped++;
        stats.reasons[reason] = (stats.reasons[reason] || 0) + 1;
    };

    let chunk = [];

    const processChunk = async () => {
        try {
            const { inserted, duplicates } = await insertChunk(chunk);
            stats.inserted += inserted;
            // Count duplicates as skipped with reason duplicate_name
            for (let i = 0; i < duplicates; i++) trackSkip('duplicate_name');
        } catch (err) {
            winston.error('Chunk insert failed:', err.message);
            // Count all rows in this chunk as skipped
            for (let i = 0; i < chunk.length; i++) trackSkip('insert_error');
        }
        chunk = [];
    };

    try {
        await new Promise((resolve, reject) => {
            const fileStream = fs.createReadStream(filePath); // create a readable stream

            const parser = parse({
                columns: true,        // use first row as header. each row comes out as {name: val, ...} and not [val, val, ...]
                skip_empty_lines: true,
                trim: true,
                relax_column_count: true, // don't crash on wrong column count
                bom: true,            // handle UTF-8 BOM
            });

            // Process each parsed row
            parser.on('readable', async () => {
                let row;
                while ((row = parser.read()) !== null) {
                    stats.total_rows++;

                    // Validate the row
                    const { valid, reason } = validateRow(row);
                    if (!valid) {
                        trackSkip(reason);
                        continue;
                    }

                    chunk.push(row);

                    // When chunk is full, insert it
                    if (chunk.length >= CHUNK_SIZE) {
                        parser.pause(); // backpressure. stops reading while inserting
                        await processChunk();
                        parser.resume();
                    }
                }
            });

            parser.on('error', (err) => {
                winston.error('CSV parse error:', err.message);
                // Don't reject — parsing errors on individual rows are handled above
                // Only reject on catastrophic stream failure
                if (err.code === 'CSV_INVALID_CLOSING_QUOTE') {
                    trackSkip('malformed_row');
                }
            });

            parser.on('end', async () => {
                // Process any remaining rows in the last partial chunk
                if (chunk.length > 0) {
                    await processChunk();
                }
                resolve();
            });

            fileStream.on('error', reject);
            fileStream.pipe(parser); // connects the readable stream to the parser
        });

        // Clean up the temp file
        fs.unlink(filePath, () => {});

        // Invalidate cache — new data was inserted
        await cacheFlushPattern('profiles:*');

        return res.status(StatusCodes.OK).json({
            status: 'success',
            total_rows: stats.total_rows,
            inserted: stats.inserted,
            skipped: stats.skipped,
            reasons: stats.reasons
        });

    } catch (err) {
        // Clean up temp file on error
        fs.unlink(filePath, () => {});
        winston.error('CSV ingestion failed:', err.message);
        next(err);
    }
};

module.exports = { uploadCSV };