const axios = require('axios');

const createAxiosInstance = (baseUrl, token = null) => {
  return axios.create({
    baseURL: baseUrl,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  });
}

module.exports = { createAxiosInstance };