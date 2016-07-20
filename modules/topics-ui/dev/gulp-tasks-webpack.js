'use strict';

var gulp = require('gulp');
var webpack = require('gulp-webpack');

function webpackPipeline(rootDir) {
  return gulp.src(rootDir + '/webpack.config.js')
    .pipe(webpack(require('../webpack.config')))
}

module.exports = webpackPipeline;
