'use strict';

var gulp = require('gulp');
var babel = require('gulp-babel');

function babelPipeline(rootDir) {
  return gulp.src(rootDir + '/shared/**/*.{js,jsx}')
    .pipe(babel({
      plugins: [
        "jsx-strip-ext",
        "add-module-exports"
      ]
    }));
}

module.exports = babelPipeline;
