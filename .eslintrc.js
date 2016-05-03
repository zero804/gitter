module.exports = {
  "env": {
    "commonjs": true,
    "node": true
  },
  "extends": "eslint:recommended",
  "rules": {
    "indent": "off",
    "comma-dangle": "off",
    "quotes": "off",
    "strict": ["error", "safe"],
    "no-unused-vars": ["warn"],
    "no-extra-boolean-cast": ["warn"],
    "complexity": ["error", { "max": 12 }],
    "max-statements-per-line": ["error", { "max": 3 }],
    "no-debugger": "error",
    "no-dupe-keys": "error",
    "no-unsafe-finally": "error",
    "no-with": "error",
    "no-useless-call": "error",
    "no-spaced-func": "error",
    "max-statements": ["warn", 30],
    "max-depth": ["error", 4]
  },
};
