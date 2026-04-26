const config = require("../../config");
const { generateCodeVerifier, generateCodeChallenge } = require("../../utils/pkce")

const gitHubOAuth = async (req, res) => {
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);

    req.session.codeVerifier = verifier;

    const params = new URLSearchParams({
        client_id: config.GITHUB_CLIENT_ID,
        redirect_uri: config.GITHUB_REDIRECT_URI,
        scope: "read:user user:email",
        state: "random_state_string",
        code_challenge: challenge,
        code_challenge_method: "S256"
    });

    res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
}

module.exports = {
    gitHubOAuth
}