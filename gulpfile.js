'use strict';

var gulpStaged = require('./build-scripts/gulp-staged');

gulpStaged({
  clean: require('./build-scripts/gulpfile-clean'),

  linter: require('./build-scripts/gulpfile-linter'),
  test: require('./build-scripts/gulpfile-test'),
  clientapp: require('./build-scripts/gulpfile-clientapp'),
  css: require('./build-scripts/gulpfile-css'),
  process: require('./build-scripts/gulpfile-process'),
  compress: require('./build-scripts/gulpfile-compress'),

  topics: require('./modules/topics-ui/gulpfile-topics'),
  embedtopics: require('./build-scripts/gulpfile-embed-topics')
});

/* eslint-disable */
process.on('exit', function(code, signal) {
  console.log('PROCESS EXIT EVENT', process.argv);
  console.log('PROCESS EXIT CODE', code);
  console.log('PROCESS EXIT SIGNAL', signal);
  console.trace();
})

var originalExit = process.exit;
process.exit = function(code, signal) {
  console.log('PROCESS EXIT', process.argv);
  console.log('PROCESS EXIT CODE', code);
  console.log('PROCESS EXIT SIGNAL', signal);
  console.trace();
  originalExit.call(process, code);
}
