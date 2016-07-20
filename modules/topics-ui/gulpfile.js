/* eslint-disable node/no-unpublished-require */

'use strict';

var gulp = require('gulp');

require('./gulpfile-topics');

gulp.task('default', ['topics:default']);
