module.exports = {
    "env": {
        "commonjs": true,
        "browser": true,
        "mocha": true
    },
    rules: {
      "strict": ["warn", "safe"],
      "max-nested-callbacks": ["error", 10]
    }
};
