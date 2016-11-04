'use strict';

var gulp = require('gulp');
var restoreTimestamps = require('./gulp-restore-timestamps');

gulp.task('embed-service-worker:post-assemble:assets', function() {
  return gulp.src(['modules/service-worker/output/assets/**', '!**/*.map'], { stat: true, base: 'modules/service-worker/output/assets' })
    .pipe(gulp.dest('output/assets/service-worker/'))
    .pipe(restoreTimestamps());
});

gulp.task('embed-service-worker:post-assemble', ['embed-service-worker:post-assemble:assets']);
