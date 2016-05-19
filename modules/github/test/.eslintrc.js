module.exports = {
    "env": {
        "commonjs": true,
        "node": true,
        "mocha": true
    },
    "rules": {
        "max-nested-callbacks": ["error", 10],
        "node/no-unpublished-require": "off",
        "node/no-missing-require": "off"
    }
};
