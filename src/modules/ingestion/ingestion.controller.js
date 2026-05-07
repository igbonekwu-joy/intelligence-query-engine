const fs = require('fs');
const { parse } = require('csv-parse');
const { uuidv7 } = require('uuidv7');
const { StatusCodes } = require('http-status-codes');
const winston = require('winston');
const pool = require('../../config/database');
const { cacheFlushPattern } = require('../../utils/cache');
const { getAgeGroup } = require('../profile/user-data.service');

const CHUNK_SIZE = 1000;       // rows per INSERT batch (increased from 500)
const PARALLEL_CHUNKS = 5;     // how many chunks to insert simultaneously

const VALID_GENDERS = ['male', 'female'];
const VALID_AGE_GROUPS = ['child', 'teenager', 'adult', 'senior'];
const REQUIRED_FIELDS = ['name', 'gender', 'age', 'country_id'];

const validateRow = (row) => {
    for (const field of REQUIRED_FIELDS) {
        if (!row[field] || String(row[field]).trim() === '') {
            return { valid: false, reason: 'missing_fields' };
        }
    }

    const gender = String(row.gender).toLowerCase().trim();
    if (!VALID_GENDERS.includes(gender)) {
        return { valid: false, reason: 'invalid_gender' };
    }

    const age = parseInt(row.age, 10);
    if (isNaN(age) || age < 0 || age > 150) {
        return { valid: false, reason: 'invalid_age' };
    }

    const countryId = String(row.country_id).toUpperCase().trim();
    if (!/^[A-Z]{2}$/.test(countryId)) {
        return { valid: false, reason: 'invalid_country' };
    }

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

    if (row.age_group && row.age_group.trim() !== '') {
        const ag = String(row.age_group).toLowerCase().trim();
        if (!VALID_AGE_GROUPS.includes(ag)) {
            return { valid: false, reason: 'invalid_age_group' };
        }
    }

    return { valid: true, reason: null };
};

const insertChunk = async (rows) => {
    if (rows.length === 0) return { inserted: 0, duplicates: 0 };

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
    const inserted = result.rowCount;
    const duplicates = rows.length - inserted;

    return { inserted, duplicates };
};

/**
 * Insert multiple chunks in parallel using Promise.all()
 * Returns combined { inserted, duplicates, errors }
 */
const insertChunksInParallel = async (chunks) => {
    const results = await Promise.all(
        chunks.map(chunk =>
            insertChunk(chunk).catch(err => {
                winston.error('Chunk insert failed:', err.message);
                return { inserted: 0, duplicates: 0, errors: chunk.length };
            })
        )
    );

    return results.reduce(
        (acc, r) => ({
            inserted: acc.inserted + (r.inserted || 0),
            duplicates: acc.duplicates + (r.duplicates || 0),
            errors: acc.errors + (r.errors || 0),
        }),
        { inserted: 0, duplicates: 0, errors: 0 }
    );
};

const uploadCSV = async (req, res, next) => {
    if (!req.file) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: 'error',
            message: 'No file uploaded. Use multipart/form-data with field name "file".'
        });
    }

    const filePath = req.file.path;

    const stats = {
        total_rows: 0,
        inserted: 0,
        skipped: 0,
        reasons: {}
    };

    const trackSkip = (reason, count = 1) => {
        stats.skipped += count;
        stats.reasons[reason] = (stats.reasons[reason] || 0) + count;
    };

    // Buffer: collect PARALLEL_CHUNKS worth of chunks before flushing
    let currentChunk = [];
    let pendingChunks = []; // holds multiple chunks waiting to be parallel-inserted

    const flushPendingChunks = async () => {
        if (pendingChunks.length === 0) return;

        const chunksToInsert = [...pendingChunks];
        pendingChunks = [];

        const { inserted, duplicates, errors } = await insertChunksInParallel(chunksToInsert);
        stats.inserted += inserted;
        if (duplicates > 0) trackSkip('duplicate_name', duplicates);
        if (errors > 0) trackSkip('insert_error', errors);
    };

    try {
        await new Promise((resolve, reject) => {
            const fileStream = fs.createReadStream(filePath);

            const parser = parse({
                columns: true,
                skip_empty_lines: true,
                trim: true,
                relax_column_count: true,
                bom: true,
            });

            parser.on('readable', async () => {
                let row;
                while ((row = parser.read()) !== null) {
                    stats.total_rows++;

                    const { valid, reason } = validateRow(row);
                    if (!valid) {
                        trackSkip(reason);
                        continue;
                    }

                    currentChunk.push(row);

                    // When current chunk is full, move it to pending
                    if (currentChunk.length >= CHUNK_SIZE) {
                        pendingChunks.push([...currentChunk]);
                        currentChunk = [];

                        // When we have enough parallel chunks, flush them all at once
                        if (pendingChunks.length >= PARALLEL_CHUNKS) {
                            parser.pause();
                            await flushPendingChunks();
                            parser.resume();
                        }
                    }
                }
            });

            parser.on('error', (err) => {
                winston.error('CSV parse error:', err.message);
                if (err.code === 'CSV_INVALID_CLOSING_QUOTE') {
                    trackSkip('malformed_row');
                }
            });

            parser.on('end', async () => {
                // Push any remaining rows as a final partial chunk
                if (currentChunk.length > 0) {
                    pendingChunks.push([...currentChunk]);
                    currentChunk = [];
                }

                // Flush any remaining pending chunks
                await flushPendingChunks();

                resolve();
            });

            fileStream.on('error', reject);
            fileStream.pipe(parser);
        });

        fs.unlink(filePath, () => {});
        await cacheFlushPattern('profiles:*');
        await cacheFlushPattern('search:*');

        return res.status(StatusCodes.OK).json({
            status: 'success',
            total_rows: stats.total_rows,
            inserted: stats.inserted,
            skipped: stats.skipped,
            reasons: stats.reasons
        });

    } catch (err) {
        fs.unlink(filePath, () => {});
        winston.error('CSV ingestion failed:', err.message);
        next(err);
    }
};

module.exports = { uploadCSV };