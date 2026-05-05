const VALID_GENDERS = ['male', 'female'];
const VALID_AGE_GROUPS = ['child', 'teenager', 'adult', 'senior'];
const VALID_SORT_FIELDS = ['age', 'created_at', 'gender_probability'];
const VALID_ORDERS = ['asc', 'desc'];

/**
 * Normalize a raw filter object from req.query into a canonical form.
 * Returns { normalized, cacheKey }
 */
const normalizeFilters = (rawQuery) => {
    const normalized = {};

    // --- gender ---
    // Always lowercase. "Female", "FEMALE", "female" → "female"
    if (rawQuery.gender) {
        const g = String(rawQuery.gender).toLowerCase().trim();
        if (VALID_GENDERS.includes(g)) normalized.gender = g;
    }

    // --- country_id ---
    // Always uppercase 2-letter code. "ng", "Ng", "NG" → "NG"
    if (rawQuery.country_id) {
        const c = String(rawQuery.country_id).toUpperCase().trim();
        if (c.length === 2 && /^[A-Z]{2}$/.test(c)) normalized.country_id = c;
    }

    // --- age_group ---
    // Always lowercase. "Adult", "ADULT" → "adult"
    if (rawQuery.age_group) {
        const ag = String(rawQuery.age_group).toLowerCase().trim();
        if (VALID_AGE_GROUPS.includes(ag)) normalized.age_group = ag;
    }

    // --- min_age / max_age ---
    // Always integers. "20", "20.0", 20 → 20
    // Discard negative values or non-numeric input
    if (rawQuery.min_age !== undefined && rawQuery.min_age !== '') {
        const n = parseInt(rawQuery.min_age, 10);
        if (!isNaN(n) && n >= 0) normalized.min_age = n;
    }

    if (rawQuery.max_age !== undefined && rawQuery.max_age !== '') {
        const n = parseInt(rawQuery.max_age, 10);
        if (!isNaN(n) && n >= 0) normalized.max_age = n;
    }

    // If min_age > max_age, swap them — same intent either way
    if (normalized.min_age !== undefined && normalized.max_age !== undefined) {
        if (normalized.min_age > normalized.max_age) {
            [normalized.min_age, normalized.max_age] = [normalized.max_age, normalized.min_age];
        }
    }

    // --- min_gender_probability / min_country_probability ---
    // Always floats rounded to 2 decimal places
    // "0.9", "0.90", 0.9 → 0.90
    if (rawQuery.min_gender_probability !== undefined && rawQuery.min_gender_probability !== '') {
        const n = parseFloat(rawQuery.min_gender_probability);
        if (!isNaN(n) && n >= 0 && n <= 1) {
            normalized.min_gender_probability = parseFloat(n.toFixed(2));
        }
    }

    if (rawQuery.min_country_probability !== undefined && rawQuery.min_country_probability !== '') {
        const n = parseFloat(rawQuery.min_country_probability);
        if (!isNaN(n) && n >= 0 && n <= 1) {
            normalized.min_country_probability = parseFloat(n.toFixed(2));
        }
    }

    // --- sort_by ---
    // Default: created_at
    const sortBy = rawQuery.sort_by
        ? String(rawQuery.sort_by).toLowerCase().trim()
        : 'created_at';
    normalized.sort_by = VALID_SORT_FIELDS.includes(sortBy) ? sortBy : 'created_at';

    // --- order ---
    // Default: desc
    const order = rawQuery.order
        ? String(rawQuery.order).toLowerCase().trim()
        : 'desc';
    normalized.order = VALID_ORDERS.includes(order) ? order : 'desc';

    // --- page ---
    // Always a positive integer. Default: 1
    const page = parseInt(rawQuery.page, 10);
    normalized.page = (!isNaN(page) && page > 0) ? page : 1;

    // --- limit ---
    // Always an integer clamped between 1 and 50. Default: 10
    const limit = parseInt(rawQuery.limit, 10);
    if (!isNaN(limit)) {
        normalized.limit = Math.min(50, Math.max(1, limit));
    } else {
        normalized.limit = 10;
    }

    // --- Build deterministic cache key ---
    // Sort keys alphabetically so { gender, country_id } and
    // { country_id, gender } produce the same key
    const cacheKey = 'profiles:' + Object.keys(normalized)
        .sort()
        .map(k => `${k}=${normalized[k]}`)
        .join(':');

    return { normalized, cacheKey };
};

/**
 * Normalize a filter object coming from the natural language parser
 * (already parsed — just needs type coercion and key sorting)
 */
const normalizeSearchFilters = (parsedFilters, page = 1, limit = 10) => {
    return normalizeFilters({
        ...parsedFilters,
        page,
        limit,
        // search results default to created_at desc
        sort_by: 'created_at',
        order: 'desc'
    });
};

module.exports = { normalizeFilters, normalizeSearchFilters };