const js = require("@eslint/js");

module.exports = [
    // files to ignore
    {
        ignores: [
            "node_modules/**",
            "dist/**",
            "coverage/**"
        ]
    },

    // your main config
    {
        ...js.configs.recommended,
        languageOptions: {
            ecmaVersion: "latest",
            globals: {
                // node globals
                require: "readonly",
                module: "readonly",
                exports: "readonly",
                process: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
                console: "readonly",

                URLSearchParams: "readonly",
                URL: "readonly",
                fetch: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                Buffer: "readonly",

                // jest globals
                describe: "readonly",
                it: "readonly",
                test: "readonly",
                expect: "readonly",
                beforeAll: "readonly",
                afterAll: "readonly",
                beforeEach: "readonly",
                afterEach: "readonly",
                jest: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-console": "off",
            "no-undef": "error"
        }
    }
];