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
    "complexity": ["error", { "max": 12 }]
  },
};
