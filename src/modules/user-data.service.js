const { createAxiosInstance } = require("../utils/axios");
const config = require("../config");
const userData = require("./user-data.model");
const { StatusCodes } = require("http-status-codes");
const winston = require("winston");

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
  return await userData.findOne({
    name: { $regex: new RegExp(`^${name}$`, "i") }
  });
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

module.exports = { fetchGender, fetchAge, fetchCountryList, findUserByName, edgeCases, getAgeGroup };