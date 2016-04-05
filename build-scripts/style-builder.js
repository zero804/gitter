var gulp = require('gulp');
var through = require('through2');
var applySourceMap = require('vinyl-sourcemaps-apply');
var sourcemaps = require('gulp-sourcemaps');

var _ = require('underscore');
var path = require('path');

var LessBuilder = require('./less-builder');

var defaults = {
  dest: './',
  sourceMapOptions: {},
  // ... postcss
  streamTransform: function(stream) { return stream; }
  // Also see `LessBuilder` opts
};

module.exports = function(entryPoints, options) {
  var opts = _.extend({}, defaults, options);

  var lessBuilder = new LessBuilder(entryPoints, opts);

  var buildStyles = function(result) {
    console.log('result', result);
    return new Promise(function(resolve, reject) {
      // We use gulp here for easy building
      var stream = gulp.src(result.source, { read: false })
        .pipe(sourcemaps.init())
        .pipe(through.obj(function(chunk, enc, cb) {
          if(chunk.sourceMap) {
            console.log('chunk.sourceMap');
            // see:
            //   - https://github.com/postcss/gulp-postcss/blob/master/index.js
            //   - https://github.com/plus3network/gulp-less/blob/master/index.js
            var map = JSON.parse(result.map);
            map.file = chunk.relative;
            map.sources = [].map.call(map.sources, function(source) {
              return path.join(path.dirname(chunk.relative), source);
            });
            applySourceMap(chunk, result.map);
          }


          cb();
        }, function(cb) {
          // flush

          cb();
        }));

      return opts.streamTransform(stream)
        .pipe(sourcemaps.write(opts.sourceMapOptions.dest, opts.sourceMapOptions.options))
        .pipe(gulp.dest(opts.dest))
        .on('end', function() {
          resolve();
        })
        .on('error', function(err) {
          reject(err);
        });
    });
  };

  lessBuilder.buildEmitter.on('build', function(result) {
    buildStyles(result);
  });

  return {
    build: function() {
      return Promise.all(lessBuilder.build().map(function(result) {
        return buildStyles(result);
      }));
    },
    startWatching: lessBuilder.startWatching,
    stopWatching: lessBuilder.stopWatching
  };
};
