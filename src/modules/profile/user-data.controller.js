const { StatusCodes } = require("http-status-codes");
const { validateName, validateQueryParams, validateSearchQueryParams, validateExportQueryParams } = require("./user-data.validator");
const { fetchGender, fetchAge, fetchCountryList, findUserByName, edgeCases, getAgeGroup, fetchProfiles } = require("./user-data.service");
const { uuidv7 } = require("uuidv7");
const pool = require("../../config/database");
const { parseNaturalQuery } = require("../../utils/queryParser");
const { Parser } = require("json2csv");

const index = async (req, res) => {
    const { error } = validateQueryParams.validate(req.query);
    if (error) {
        return res.status(StatusCodes.BAD_REQUEST).json({ status: "error", message: "Invalid query parameters" });
    }

    const { page, limit, total, rows: result } = await fetchProfiles(req, { paginate: true });

    if (total === 0) {
        return res.status(StatusCodes.NOT_FOUND).json({ status: "error", message: "No profiles found" });
    }

    const totalPages = Math.ceil(total / limit);
    const self = `${req.baseUrl}?page=${page}&limit=${limit}`;
    const next = page * limit < total ? `${req.baseUrl}?page=${page + 1}&limit=${limit}` : null;
    const prev = page > 1 ? `${req.baseUrl}?page=${page - 1}&limit=${limit}` : null;

    return res.status(StatusCodes.OK).json({ 
        status: "success", 
        page: page, 
        limit: limit, 
        total, 
        total_pages: totalPages,
        links: {
            self,
            next,
            prev
        },
        data: result 
    });
} 


const search = async (req, res) => {
    const { q, page: pageQuery, limit: limitQuery } = req.query;

    const { error } = validateSearchQueryParams.validate(req.query);
    if (error) {
        return res.status(StatusCodes.BAD_REQUEST).json({ status: "error", message: "Invalid query parameters" });
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
        values.push(filters.gender.toLowerCase());
    }

    if (filters.age_group) {
        conditions.push(`age_group = $${paramCount++}`);
        values.push(filters.age_group.toLowerCase());
    }

    if (filters.country_id) {
        conditions.push(`country_id = $${paramCount++}`);
        values.push(filters.country_id.toUpperCase());
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

    const [countResult, result] = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM profiles ${whereClause}`, values),
        pool.query(
            `SELECT id, name, gender, gender_probability, age, age_group, country_id, country_name, country_probability, created_at AT TIME ZONE 'UTC' AS created_at
            FROM profiles
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset}`,
            values
        )
    ]);

    const totalItems = parseInt(countResult.rows[0].count);
    if (totalItems === 0) {
        return res.status(StatusCodes.NOT_FOUND).json({
            status: 'error',
            message: 'No profiles found matching your query'
        });
    }

    const total_pages = Math.ceil(totalItems / limit);
    const self = `${req.baseUrl + req.path}?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`;
    const next = page * limit < totalItems ? `${req.baseUrl + req.path}?q=${encodeURIComponent(q)}&page=${page + 1}&limit=${limit}` : null;
    const prev = page > 1 ? `${req.baseUrl + req.path}?q=${encodeURIComponent(q)}&page=${page - 1}&limit=${limit}` : null;

    return res.status(StatusCodes.OK).json({
        status: 'success',
        page,
        limit,
        total: totalItems,
        total_pages,
        links: {
            self,
            next,
            prev
        },
        data: result.rows
    });

}

const exportProfiles = async (req, res) => {
    const { error } = validateExportQueryParams.validate(req.query);
    if (error) {
        return res.status(StatusCodes.BAD_REQUEST).json({ status: "error", message: "Invalid query parameters" });
    }

    const { rows: result, total } = await fetchProfiles(req, { paginate: false });
    if (total === 0) {
        return res.status(StatusCodes.NOT_FOUND).json({ status: "error", message: "No profiles found" });
    }

    const fields = [
        { label: 'id', value: 'id' },
        { label: 'name', value: 'name' },
        { label: 'gender', value: 'gender' },
        { label: 'gender_probability', value: 'gender_probability' },
        { label: 'age', value: 'age' },
        { label: 'age_group', value: 'age_group' },
        { label: 'country_id', value: 'country_id' },
        { label: 'country_name', value: 'country_name' },
        { label: 'country_probability', value: 'country_probability' },
        { label: 'created_at', value: 'created_at' },
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(result);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="profiles_${timestamp}.csv"`);

    return res.status(StatusCodes.OK).send(csv);
}

const fetchUserData = async (req, res) => {
    const id = req.params.id;
    
    const user = await pool.query(`SELECT * FROM profiles WHERE id = $1`, [id]);
    if (user.rows.length === 0) {
        return res.status(StatusCodes.NOT_FOUND).json({ status: "error", message: "User not found" });
    }

    return res.status(StatusCodes.OK).json({ status: "success", data: user.rows[0] });
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
            (id, name, gender, gender_probability, age, age_group, country_id, country_probability) 
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, name, gender, gender_probability, age, age_group, country_id, country_probability, created_at AT TIME ZONE 'UTC' AS created_at`,
        [
            id, 
            name, 
            gender, 
            gender_probability,  
            age, 
            age_group, 
            topCountry.country_id, 
            topCountry.probability.toFixed(2) 
        ]
    );

    const user = result.rows[0];

    return res.status(StatusCodes.CREATED).json({ status: "success", data: user });
}

const updateUserRole = async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['analyst', 'admin'];
    if (!validRoles.includes(role)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: 'error',
            message: `Invalid role. Valid roles are: ${validRoles.join(', ')}`
        });
    }

    const result = await pool.query(
        `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, email, role`,
        [role, id]
    );

    if (result.rows.length === 0) {
        return res.status(StatusCodes.NOT_FOUND).json({
            status: 'error',
            message: 'User not found'
        });
    }

    return res.status(StatusCodes.OK).json({
        status: 'success',
        data: result.rows[0]
    });
};

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
    exportProfiles,
    storeUserData,
    fetchUserData,
    deleteUserData,
    updateUserRole
}