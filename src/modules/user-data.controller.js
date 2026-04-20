const { StatusCodes } = require("http-status-codes");
const { validateName } = require("./user-data.validator");
const { fetchGender, fetchAge, fetchCountryList, findUserByName, edgeCases, getAgeGroup, filter, sort } = require("./user-data.service");
const { uuidv7 } = require("uuidv7");
const userData = require("./user-data.model");
const pool = require("../startup/database");

const index = async (req, res) => {
    const { gender, country_id, age_group, min_age, max_age, min_gender_probability, min_country_probability, sort_by, order } = req.query;
    
    const { whereClause, values } = filter(gender, country_id, age_group, min_age, max_age, min_gender_probability, min_country_probability);

    const orderBy = sort(sort_by, order);

    const query = `
        SELECT id, name, gender, gender_probability, age, age_group, country_id, country_name, country_probability, created_at
        FROM profiles
        ${whereClause}
        ${orderBy}
    `;

    const result = await pool.query(query, values);
    const total = result.rows.length;

    return res.status(StatusCodes.OK).json({ status: "success", total, data: result.rows });
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

    const data = { 
        id, 
        name, 
        gender, 
        gender_probability, 
        sample_size, 
        age, 
        age_group, 
        country_id: topCountry.country_id, 
        country_probability: topCountry.probability.toFixed(2) 
    };
    let user = new userData(data);
    user = await user.save();

    return res.status(StatusCodes.CREATED).json({ status: "success", data: user });
}

const fetchUserData = async (req, res) => {
    const id = req.params.id;
    
    const user = await userData.findOne({ id });

    if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({ status: "error", message: "User not found" });
    }

    return res.status(StatusCodes.OK).json({ status: "success", data: user });
}

const deleteUserData = async (req, res) => {
    const id = req.params.id;

    const user = await userData.findOneAndDelete({ id });

    if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({ status: "error", message: "User not found" });
    }

    return res.status(StatusCodes.NO_CONTENT).json({  });
}

module.exports = {
    index,
    storeUserData,
    fetchUserData,
    deleteUserData
}