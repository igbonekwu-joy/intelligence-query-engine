const { createAxiosInstance } = require("../../utils/axios");
const config = require("../../config");
const { StatusCodes } = require("http-status-codes");
const winston = require("winston");
const pool = require("../../startup/database");

const axiosGetInstance = createAxiosInstance(
  '/'
); 

const fetchGender = async (name) => {
  try{
    const response = await axiosGetInstance.get(
                      `${config.GENDERIZE_API_URL}`, 
                      { params: 
                        { name }  
                      }
                    );

    return response;
  } catch (error) {
    winston.error("Genderize returned an invalid response", error);
    return { statusCode: StatusCodes.BAD_GATEWAY, message: "Genderize returned an invalid response" };
  }

}

const fetchAge = async (name) => {
  try {
    const response = await axiosGetInstance.get(
                        `${config.AGIFY_API_URL}`, 
                        { params: 
                          { name } 
                        }
                      );

    return response;
  }
  catch (error) {
    winston.error("Agify returned an invalid response", error);
    return { statusCode: StatusCodes.BAD_GATEWAY, message: "Agify returned an invalid response" };
  }
}

const fetchCountryList = async (name) => {
  try {
    const response = await axiosGetInstance.get(
                        `${config.NATIONALIZE_API_URL}`, 
                        { params:  
                          { name } 
                        }
                      );

    return response;
  }
  catch (error) {
    winston.error("Nationalize returned an invalid response", error);
    return { statusCode: StatusCodes.BAD_GATEWAY, message: "Nationalize returned an invalid response" };
  }
}

const findUserByName = async (name) => {
  const result = await pool.query(`SELECT * FROM profiles WHERE LOWER(name) = LOWER($1)`, [name]);
  return result.rows[0];
}

const edgeCases = (gender, age, countries, sample_size) => {
  if (gender === null || sample_size === 0) {
    return { statusCode: StatusCodes.BAD_GATEWAY, message: "Genderize returned an invalid response" };
  }

  if (age === null) {
    return { statusCode: StatusCodes.BAD_GATEWAY, message: "Agify returned an invalid response" };
  }

  if (countries.length === 0) {
    return { statusCode: StatusCodes.BAD_GATEWAY, message: "Nationalize returned an invalid response" };
  }
}

const getAgeGroup = (age) => {
  if (age < 0) return null; 

  if (age <= 12) return "child";
  if (age <= 19) return "teenager";
  if (age <= 59) return "adult";

  return "senior";
};

const filter = (gender, country_id, age_group, min_age, max_age, min_gender_probability, min_country_probability) => {
  let conditions = [];
  let values = [];
  let paramCount = 1;

  if (gender) {
    conditions.push(`gender = $${paramCount++}`);
    values.push(gender.toLowerCase());
  }

  if (country_id) {
    conditions.push(`country_id = $${paramCount++}`);
    values.push(country_id.toUpperCase());
  }

  if (age_group) {
    conditions.push(`age_group = $${paramCount++}`);
    values.push(age_group.toLowerCase());
  }

  if (min_age) {
    conditions.push(`age >= $${paramCount++}`);
    values.push(Number(min_age));
  }

  if (max_age) {
      conditions.push(`age <= $${paramCount++}`);
      values.push(Number(max_age));
  }

  if (min_gender_probability) {
    conditions.push(`gender_probability >= $${paramCount++}`);
    values.push(Number(min_gender_probability));
  }

  if (min_country_probability) {
    conditions.push(`country_probability >= $${paramCount++}`);
    values.push(Number(min_country_probability));
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return { whereClause, values };
}

const sort = (sort_by, order) => {
  const allowedSortFields = ['age', 'created_at', 'gender_probability'];
  const allowedOrders = ['asc', 'desc'];

  const sortBy = allowedSortFields.includes(sort_by) ? sort_by : 'created_at'; 
  const sortOrder = allowedOrders.includes(order?.toLowerCase()) ? order.toLowerCase() : 'asc'; 

  const orderBy = `ORDER BY ${sortBy} ${sortOrder}`;

  return orderBy;
}

const paginate = (pageQuery, limitQuery, shouldPaginate) => {
  const page = Math.max(1, parseInt(pageQuery) || 1);  
  const limit = Math.min(50, Math.max(1, parseInt(limitQuery) || 10)); 
  const offset = (page - 1) * limit; //skip

  const paginationClause = shouldPaginate ? `LIMIT ${limit} OFFSET ${offset}` : '';

  return { page, limit, offset, paginationClause };
}

const fetchProfiles = async (req, options = {}) => {
  const shouldPaginate = options.paginate;
  const { gender, country_id, age_group, min_age, max_age, min_gender_probability, min_country_probability, sort_by, order, page, limit } = req.query;

  const { whereClause, values } = filter(gender, country_id, age_group, min_age, max_age, min_gender_probability, min_country_probability);

  const orderBy = sort(sort_by, order);

  const { page: pageEntered, limit: limitEntered, offset, paginationClause } = paginate(page, limit, shouldPaginate);

  const [result, countResult] = await Promise.all([
    pool.query(
      `SELECT id, name, gender, gender_probability, age, age_group, country_id, country_name, country_probability, created_at
       FROM profiles
       ${whereClause}
       ${orderBy}
       ${paginationClause}`,
      values
    ),
    pool.query(
      `SELECT COUNT(*) FROM profiles ${whereClause}`,
      values  
    )
  ]);

  const total = parseInt(countResult.rows[0].count, 10);
  
  return { page: pageEntered, limit: limitEntered, total, rows: result.rows };
}

module.exports = { 
  fetchGender, 
  fetchAge, 
  fetchCountryList, 
  findUserByName, 
  edgeCases, 
  getAgeGroup, 
  fetchProfiles
};