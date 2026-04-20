const { StatusCodes } = require("http-status-codes");
const { validateName } = require("./user-data.validator");
const { fetchGender, fetchAge, fetchCountryList, findUserByName, edgeCases, getAgeGroup } = require("./user-data.service");
const { uuidv7 } = require("uuidv7");
const userData = require("./user-data.model");

const index = async (req, res) => {
    const { gender, country_id, age_group } = req.query;
    let filter = {};

    if (gender) {
        filter.gender = gender.toLowerCase();
    }

    if (country_id) {
        filter.country_id = country_id.toUpperCase();
    }

    if (age_group) {
        filter.age_group = age_group;
    }

    let users = await userData.find(filter, { id: 1, name: 1, gender: 1, country_id: 1, age: 1, age_group: 1 });

    let count = users.length;
    return res.status(StatusCodes.OK).json({ status: "success", count, data: users });
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