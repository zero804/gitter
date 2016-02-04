'use strict';

var path          = require('path');
var _             = require('underscore');
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
      'es5-shim',
    ],

    // list of files / patterns to load in the browser
    files: [
      './fixtures/runner.js',
    ],

    // list of files to exclude
    exclude: [
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      './fixtures/runner.js': ['webpack', 'coverage'],
    },

    plugins: [
      require('karma-es5-shim'),
      require('karma-mocha'),
      require('karma-chai'),
      require('karma-sourcemap-loader'),
      require('karma-coverage'),
    ],

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress', 'coverage'],

    webpack: webpackConfig,

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

  //Optimised for quick testing
  var phantomKarmaConfig = {
    browsers: ['PhantomJS'],

    files: [
      './fixtures/runner.js',
    ],

    coverageReporter: {
      type: 'text-summary',
      check: {
        global: {
          excludes: [
            path.resolve(__dirname, '../../node_modules/**/*.*'),
          ],
        },
      },
    },

  };

  //Optimised for debugging
  var chromeKarmaConfig = {
    browsers: ['Chrome'],
    coverageReporter: {
      type: 'html',
      dir: path.resolve(__dirname, './fixtures/coverage'),
    },
  };

  // If in production mode, move the testing to browserstack
  if (!!process.env.USE_BROWSERSTACK) {
    karmaConfig.plugins.push(require('karma-browserstack-launcher'));
    karmaConfig.plugins.push(require('karma-webpack'));
    karmaConfig = _.extend(karmaConfig, chromeKarmaConfig, browserstackKarmaConfig);
  }

  //
  else if (!process.env.USE_BROWSERSTACK && process.env.NODE_ENV === 'debug') {
    karmaConfig.plugins.push(require('karma-chrome-launcher'));
    karmaConfig.plugins.push(require('karma-webpack-with-fast-source-maps'));
    karmaConfig = _.extend(karmaConfig, chromeKarmaConfig);
  }

  //
  else if(!process.env.USE_BROWSERSTACK){
    karmaConfig.plugins.push(require('karma-phantomjs-launcher'));
    karmaConfig.plugins.push(require('karma-webpack-with-fast-source-maps'));
    karmaConfig = _.extend(karmaConfig, phantomKarmaConfig);
  }

  config.set(karmaConfig);
};
