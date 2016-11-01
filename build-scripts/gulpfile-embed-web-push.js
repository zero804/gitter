'use strict';

var gulp = require('gulp');
var restoreTimestamps = require('./gulp-restore-timestamps');

gulp.task('embed-web-push:post-assemble:assets', function() {
  return gulp.src(['modules/web-push/output/assets/**', '!**/*.map'], { stat: true, base: 'modules/web-push/output/assets' })
    .pipe(gulp.dest('output/assets/web-push/'))
    .pipe(restoreTimestamps());
});

gulp.task('embed-web-push:post-assemble', ['embed-web-push:post-assemble:assets']);
