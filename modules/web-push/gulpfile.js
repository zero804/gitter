/* eslint-disable node/no-unpublished-require */
'use strict';

var gulpStaged = require('../../build-scripts/gulp-staged');

gulpStaged({
  'web-push': require('./gulpfile-web-push')
});
