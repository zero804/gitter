module.exports = {
    "env": {
        "commonjs": true,
        "browser": true,
        "mocha": true
    },
    "plugins": [
      "mocha"
    ],
    "rules": {
      "mocha/no-exclusive-tests": "error",
      "strict": ["warn", "safe"],
    }
};
