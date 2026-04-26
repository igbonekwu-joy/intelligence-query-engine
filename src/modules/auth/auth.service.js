const { createAxiosInstance } = require("../profile/service/axios");

const axiosAuthInstance = createAxiosInstance(
  '/'
); 

const getGitHubAccessToken = async () => {

}

module.exports = {
    getGitHubAccessToken
}