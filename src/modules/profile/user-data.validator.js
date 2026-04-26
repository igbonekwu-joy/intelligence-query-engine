const Joi = require('joi');

const validateName = Joi.object().keys({
    name: Joi.string().pattern(/^[a-zA-Z]+$/).required().messages({
        'string.base': 'Name must be a string',
        'string.pattern.base': 'Name must be a string',
        'string.empty': 'Name is required',
        'any.required': 'Name is required'
    })
});

const validateQueryParams = Joi.object().keys({
    gender: Joi.string().valid('male', 'female'),
    age_group: Joi.string().valid('child', 'teenager', 'adult', 'senior'),
    country_id: Joi.string().length(2),
    min_age: Joi.number().integer().min(0),
    max_age: Joi.number().integer().min(0),
    min_gender_probability: Joi.number().min(0),
    min_country_probability: Joi.number().min(0),
    sort_by: Joi.string().valid('age', 'created_at', 'gender_probability'),
    order: Joi.string().valid('asc', 'desc'),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1)
});

module.exports = {
    validateName,
    validateQueryParams
}