const { StatusCodes } = require("http-status-codes");
const config = require("../../config");
const { generateCodeVerifier, generateCodeChallenge } = require("../../utils/pkce");
const { getGitHubAccessToken, getGitHubUserProfile, getGitHubUserEmail, getOrCreateUser } = require("./auth.service");
const { generateAccessToken, generateRefreshToken } = require("../../utils/tokens");

const gitHubOAuth = async (req, res) => {
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);

    req.session.codeVerifier = verifier;

    const params = new URLSearchParams({
        client_id: config.GITHUB_CLIENT_ID,
        redirect_uri: config.GITHUB_REDIRECT_URI,
        scope: "read:user user:email",
        state: config.GITHUB_STATE_STRING,
        code_challenge: challenge,
        code_challenge_method: "S256"
    });

    res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
}

const gitHubCallback = async (req, res) => {
    const { code, state } = req.query;
    const verifier = req.session.codeVerifier;

    if (state !== config.GITHUB_STATE_STRING) {
        return res.status(StatusCodes.BAD_REQUEST).json({ status: "error", message: "Invalid state parameter" });
    }

    if (!code || !verifier) {
        return res.status(StatusCodes.BAD_REQUEST).json({ status: "error", message: "Missing code or verifier" });
    }

    const githubAccessToken = await getGitHubAccessToken({ code, verifier }); 
    if (githubAccessToken.statusCode) {
        return res.status(githubAccessToken.statusCode).json({ status: "error", message: githubAccessToken.message });
    }

    const userProfile = await getGitHubUserProfile(githubAccessToken);
    let email = userProfile.email;
    if (!email) {
        email = await getGitHubUserEmail(githubAccessToken);
    }

    const user = await getOrCreateUser(userProfile, email);

    delete req.session.codeVerifier;

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user.id);

    return res.status(StatusCodes.OK).json({ status: "success", access_token: accessToken, refresh_token: refreshToken });
}

module.exports = {
    gitHubOAuth,
    gitHubCallback
}