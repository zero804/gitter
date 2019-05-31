'use strict';

module.exports = {
  testMatch: ['<rootDir>/test/public-js/**/*-test.js'],
  moduleFileExtensions: ['js', 'json', 'vue'],
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.vue$': 'vue-jest'
  }
};
