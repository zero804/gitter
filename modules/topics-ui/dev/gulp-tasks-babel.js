'use strict';

var gulp = require('gulp');
var babel = require('gulp-babel');
var babelConfig = require('./babel-config');

function babelPipeline(rootDir) {
  return gulp.src(rootDir + '/containers/**.{js,jsx}')
      .pipe(babel(babelConfig));
}

module.exports = babelPipeline;
