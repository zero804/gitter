'use strict';

var path = require('path');

// Karma configuration
// Generated on Thu Jan 07 2016 09:58:34 GMT-0600 (CST)

var _ = require('underscore');

var webpackConfig = require('./webpack.config');

module.exports = function(config) {
  var karmaConfig = {

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: [
      'mocha',
      'chai',
    ],

    // list of files / patterns to load in the browser
    files: [
      'fixtures/build/test.js',
    ],

    // list of files to exclude
    exclude: [
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'fixtures/build/test.js': ['coverage'],
    },

    plugins: [
      require('karma-chrome-launcher'),
      require('karma-phantomjs-launcher'),
      require('karma-mocha'),
      require('karma-chai'),
      require('karma-sourcemap-loader'),
      require('karma-coverage')
    ],

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress', 'coverage'],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: [
      'Chrome'

      // Needs `karma-phantomjs-launcher`
      //'PhantomJS'
    ],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity,

    // optionally, configure the reporter
    coverageReporter: {
      type: 'text-summary',
      check: {
        global: {
          excludes: [
            path.resolve(__dirname, '../../node_modules/**/*.*')
          ]
        }
      }
    },
  };

  var browserstackKarmaConfig = {
    browserStack: {
      username: process.env.BROWSERSTACK_USERNAME,
      accessKey: process.env.BROWSERSTACK_KEY,
    },

    // define browsers
    customLaunchers: {
      bs_chrome_mac: {
        base: 'BrowserStack',
        browser: 'chrome',
        browser_version: '47.0',
        os: 'OS X',
        os_version: 'Mountain Lion',
      },
      bs_firefox_mac: {
        base: 'BrowserStack',
        browser: 'firefox',
        browser_version: '43.0',
        os: 'OS X',
        os_version: 'Mountain Lion',
      },
      bs_ie_win: {
        base: 'BrowserStack',
        browser: 'ie',
        browser_version: '11.0',
        os: 'Windows',
        os_version: '8.1',
      },
      bs_edge_win: {
        base: 'BrowserStack',
        browser: 'edge',
        browser_version: '12.0',
        os: 'Windows',
        os_version: '10',
      },
    },

    browsers: [
      'bs_chrome_mac',
      'bs_firefox_mac',
      'bs_ie_win',
      'bs_edge_win',
    ],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,
  };

  // If in production mode, move the testing to browserstack
  if (process.env.NODE_ENV === 'prod') {
    karmaConfig.plugins.push(require('karma-browserstack-launcher'));
    karmaConfig = _.extend(karmaConfig, browserstackKarmaConfig);
  }

  config.set(karmaConfig);
}
