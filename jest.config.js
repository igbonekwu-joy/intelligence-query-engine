module.exports = {
    testEnvironment: "node",
    "globalSetup": "./src/__tests__/tables/setup.js",
    "globalTeardown": "./src/__tests__/tables/teardown.js",
    testMatch: ["**/__tests__/**/*.test.js"],
    coveragePathIgnorePatterns: ["/node_modules/"]
}