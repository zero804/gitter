/* eslint-disable node/no-unpublished-require */
'use strict';

require('./gulpfile-topics');

var gulpStaged = require('../../build-scripts/gulp-staged');

gulpStaged({
  topics: require('./gulpfile-topics')
});
