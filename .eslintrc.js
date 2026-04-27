module.exports = {
    env: {
        node: true,
        es2021: true,
        jest: true
    },
    extends: 'eslint:recommended', //inherit recommended rules from eslint
    parserOptions: {
        ecmaVersion: 'latest' //understand latest ECMAScript features
    },
    rules: {
        'no-unused-vars': 'warn', //show warnings for unused variables, but doesn't fail
        'no-console': 'off', //allow console.log for debugging
        'no-undef': 'error' // if a variable is used but not defined, show an error
    }
};