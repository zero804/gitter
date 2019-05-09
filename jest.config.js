'use strict';

module.exports = {
  testMatch: ['<rootDir>/test/public-js/**/*-test.js'],
  moduleFileExtensions: ['js', 'json', 'vue'],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|svg)$': '<rootDir>/test/public-js/vue/__mocks__/file_mock.js'
  },
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.vue$': 'vue-jest',
    '^.+\\.hbs$': 'jest-handlebars'
  },
  browser: true
};
