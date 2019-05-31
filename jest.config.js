'use strict';

module.exports = {
  testMatch: ['<rootDir>/test/public-js/vue/**/*-test.js'],
  moduleFileExtensions: ['js', 'json', 'vue'],
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.vue$': 'vue-jest'
  }
};
