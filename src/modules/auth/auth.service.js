const { createAxiosInstance } = require("../../utils/axios");

const axiosAuthInstance = createAxiosInstance(
  '/'
); 

const getGitHubAccessToken = async () => {

}

module.exports = {
    getGitHubAccessToken
}