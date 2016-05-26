module.exports = {
    "env": {
        "commonjs": true,
        "node": true,
        "mocha": true
    },
    "plugins": [
      "mocha"
    ],
    "rules": {
      "mocha/no-exclusive-tests": "error",
      "no-console": "warn",
      "strict": ["warn", "safe"],
      "max-nested-callbacks": ["error", 10]
    },

};
