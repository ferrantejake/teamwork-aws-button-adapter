module.exports = {
    "extends": "standard",
    "plugins": [
        "standard",
        "promise"
    ],
    "rules": {
        "no-var": ["error"],
        "semi": ["off"],
        "indent": ["off"],
        "eol-last": ["off"],
        "no-trailing-spaces": ["warn"],
        "space-before-function-paren": ["off"],
        "no-template-curly-in-string": ["error"],
        "eqeqeq": ["error"],
        "no-alert": ["error"],
        "no-multiple-empty-lines": ["warn"],
        "prefer-const": ["error"],
        "arrow-body-style": ["error", "always"],
        "arrow-parens": ["error", "as-needed"],
        "prefer-arrow-callback": ["error"]
    }
};