const crypto = require('crypto');

const generateCodeVerifier = () => {
    return crypto.randomBytes(32).toString('hex');
}

const generateCodeChallenge = (verifier) => {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
}

module.exports = {
    generateCodeVerifier,
    generateCodeChallenge
}