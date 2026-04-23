const { StatusCodes } = require("http-status-codes");
const { validateName, validateQueryParams } = require("./user-data.validator");
const { fetchGender, fetchAge, fetchCountryList, findUserByName, edgeCases, getAgeGroup, filter, sort, paginate, fetchProfiles } = require("./user-data.service");
const { uuidv7 } = require("uuidv7");
const pool = require("../startup/database");
const winston = require("winston");
const { parseNaturalQuery } = require("../utils/queryParser");

const index = async (req, res) => {
    const { error } = validateQueryParams.validate(req.query);
    if (error) {
        return res.status(StatusCodes.BAD_REQUEST).json({ status: "error", message: "Invalid query parameters" });
    }

    const { page, limit, total, rows: result } = await fetchProfiles(req);

    if (total === 0) {
        return res.status(StatusCodes.NOT_FOUND).json({ status: "error", message: "No profiles found" });
    }

    return res.status(StatusCodes.OK).json({ 
        status: "success", 
        page: page, 
        limit: limit, 
        total, 
        data: result 
    });
} 

const search = async (req, res) => {
    const VALID_QUERY_PARAMS = ['q', 'page', 'limit'];
    
    const { q, page: pageQuery, limit: limitQuery } = req.query;

    // check for invalid query parameters
    const invalidParams = Object.keys(req.query).filter(k => !VALID_QUERY_PARAMS.includes(k));
    if (invalidParams.length > 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: 'error',
            message: 'Invalid query parameters'
        });
    }

    // missing or empty q
    if (!q || q.trim() === '') {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: 'error',
            message: 'Invalid query parameters'
        });
    }

    // invalid page/limit types
    if ((pageQuery && isNaN(pageQuery)) || (limitQuery && isNaN(limitQuery))) {
        return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
            status: 'error',
            message: 'Invalid query parameters'
        });
    }

    // parse natural language query
    const filters = parseNaturalQuery(q);

    if (!filters) {
        return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
            status: 'error',
            message: 'Unable to interpret query'
        });
    }

    // pagination
    const page = Math.max(1, parseInt(pageQuery) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(limitQuery) || 10));
    const offset = (page - 1) * limit;

    // build parameterized query
    let conditions = [];
    let values = [];
    let paramCount = 1;

    if (filters.gender) {
        conditions.push(`gender = $${paramCount++}`);
        values.push(filters.gender);
    }

    if (filters.age_group) {
        conditions.push(`age_group = $${paramCount++}`);
        values.push(filters.age_group);
    }

    if (filters.country_id) {
        conditions.push(`country_id = $${paramCount++}`);
        values.push(filters.country_id);
    }

    if (filters.min_age !== undefined) {
        conditions.push(`age >= $${paramCount++}`);
        values.push(filters.min_age);
    }

    if (filters.max_age !== undefined) {
        conditions.push(`age <= $${paramCount++}`);
        values.push(filters.max_age);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // get total count (reuse same values array)
    const countQuery = `SELECT COUNT(*) FROM profiles ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const totalItems = parseInt(countResult.rows[0].count);

    // 404 - no profiles found
    if (totalItems === 0) {
        return res.status(StatusCodes.NOT_FOUND).json({
            status: 'error',
            message: 'No profiles found matching your query'
        });
    }

    const query = `
        SELECT id, name, gender, gender_probability, age, age_group, country_id, country_name, country_probability, created_at AT TIME ZONE 'UTC' AS created_at
        FROM profiles
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
    `;

    const result = await pool.query(query, values);

    return res.status(StatusCodes.OK).json({
        status: 'success',
        page,
        limit,
        total: totalItems,
        data: result.rows
    });

}

const storeUserData = async (req, res) => {
    const name = req.body.name;

    let existingUser = await findUserByName(name);
    if(existingUser) {
        return res.status(StatusCodes.OK).json({ status: "success", message: "Profile already exists", data: existingUser });
    }

    // Validate with Joi
    const { error } = validateName.validate({ name });
    if (error) {
        const isRequired = error.details[0].type === 'string.empty' || error.details[0].type === 'any.required';
        const statusCode = isRequired ? StatusCodes.BAD_REQUEST : StatusCodes.UNPROCESSABLE_ENTITY;
        
        return res.status(statusCode).json({ status: "error", message: error.details[0].message });
    }

    const fetchResult = await fetchGender(name);
    const fetchAgeResult = await fetchAge(name);
    const fetchCountryListResult = await fetchCountryList(name);

    if (fetchResult.statusCode || fetchAgeResult.statusCode || fetchCountryListResult.statusCode) {
        return res.status(StatusCodes.BAD_GATEWAY).json({ status: "502", message: fetchResult.message || fetchAgeResult.message || fetchCountryListResult.message });
    }
    
    const { gender, probability: gender_probability, count: sample_size } = fetchResult.data;
    const { age } = fetchAgeResult.data;
    const countries = fetchCountryListResult.data.country;

    const checkEdgeCases = edgeCases(gender, age, countries, sample_size);
    if (checkEdgeCases) {
        return res.status(checkEdgeCases.statusCode).json({ status: "error", message: checkEdgeCases.message });
    }

    const age_group = getAgeGroup(age);
    const topCountry = countries.reduce((highest, current) => 
        current.probability > highest.probability ? current : highest
    );
    const id = uuidv7();

    const result = await pool.query(
        `INSERT INTO profiles 
            (id, name, gender, gender_probability, sample_size, age, age_group, country_id, country_probability) 
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, name, gender, gender_probability, sample_size, age, age_group, country_id, country_probability, created_at AT TIME ZONE 'UTC' AS created_at`,
        [
            id, 
            name, 
            gender, 
            gender_probability, 
            sample_size,  
            age, 
            age_group, 
            topCountry.country_id, 
            topCountry.probability.toFixed(2) 
        ]
    );

    const user = result.rows[0];

    return res.status(StatusCodes.CREATED).json({ status: "success", data: user });
}

const fetchUserData = async (req, res) => {
    const id = req.params.id;
    
    const user = await pool.query(`SELECT * FROM profiles WHERE id = $1`, [id]);
    if (user.rows.length === 0) {
        return res.status(StatusCodes.NOT_FOUND).json({ status: "error", message: "User not found" });
    }

    return res.status(StatusCodes.OK).json({ status: "success", data: user.rows[0] });
}

const deleteUserData = async (req, res) => {
    const id = req.params.id;

    const user = await pool.query(`DELETE FROM profiles WHERE id = $1 RETURNING *`, [id]);

    if (user.rows.length === 0) {
        return res.status(StatusCodes.NOT_FOUND).json({ status: "error", message: "User not found" });
    }

    return res.status(StatusCodes.NO_CONTENT).json({  });
}

module.exports = {
    index,
    search,
    storeUserData,
    fetchUserData,
    deleteUserData
}