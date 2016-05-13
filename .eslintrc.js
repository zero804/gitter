module.exports = {
  "env": {
    "commonjs": true,
    "node": true
  },
  "plugins": ["node"],
  "extends": "eslint:recommended",
  "rules": {
    "indent": "off",
    "comma-dangle": "off",
    "quotes": "off",
    "eqeqeq": ["warn", "allow-null"],
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
    "max-depth": ["error", 4],
    "no-sequences": "error",
    "no-warning-comments": ["warn", { "terms": ["fixme", "xxx"], "location": "anywhere" }],
    "radix": "error",
    "yoda": "error",
    "no-nested-ternary": "warn",
    "no-whitespace-before-property": "error",
    "no-trailing-spaces": ["error", { "skipBlankLines": true }],
    // "semi": ["error", "always", { "omitLastInOneLineBlock": true}] //
    "space-in-parens": ["warn", "never"],  // Change to error once merged
    "max-nested-callbacks": ["error", 6],   // Lets aim to bring this down
    "eol-last": "warn",                     // Change to error once merged
    "no-mixed-spaces-and-tabs": "error",
    "no-negated-condition": "warn",
    "no-unneeded-ternary": "error",

    "node/no-missing-require": "error",
    "node/no-unsupported-features": ["error", {"version": 0.10 }],
  },
};
