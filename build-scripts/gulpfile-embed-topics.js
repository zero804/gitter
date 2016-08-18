'use strict';

var gulp = require('gulp');
var restoreTimestamps = require('./gulp-restore-timestamps');

/**
 * These tasks are used to copy data from the topics gulpfile out to the main app
 */

var TOPIC_RELOCATIONS = {
  babel: 'output/app/modules/topics-ui/shared/',
  assets: 'output/assets/topics/'
}

var TOPIC_RELOCATION_TASKS = Object.keys(TOPIC_RELOCATIONS).map(function(key) {
  return 'embedtopics:post-assemble:' + key;
});

Object.keys(TOPIC_RELOCATIONS).forEach(function(key) {
  var dest = TOPIC_RELOCATIONS[key];

  gulp.task('embedtopics:post-assemble:' + key, function() {
    return gulp.src(['modules/topics-ui/output/' + key + '/**', '!**/*.map'], { stat: true, base: 'modules/topics-ui/output/' + key })
      .pipe(gulp.dest(dest))
      .pipe(restoreTimestamps());
  });
});

gulp.task('embedtopics:post-assemble', TOPIC_RELOCATION_TASKS);
