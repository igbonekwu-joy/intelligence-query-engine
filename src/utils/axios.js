const axios = require('axios');

const createAxiosInstance = (baseUrl) => {
  return axios.create({
    baseURL: baseUrl,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  });
}

module.exports = { createAxiosInstance };