var Promise = require('bluebird');
var _ = require('underscore');

var fs = require('fs-extra');
var readFile = Promise.promisify(fs.readFile);
var outputFile = Promise.promisify(fs.outputFile);

var path = require('path');
var pathUtils = require('./lib/path-parse-format-utils');
var url = require('url');

var less = require('less');
var chokidar = require('chokidar');
var EventEmitter = require('events').EventEmitter;

var lessDependencyMapUtils = require('./lib/less-dependency-map-utils.js');




var getUrlPortionOfParsedUrl = function(parsedUrl) {
  var urlPortion = (parsedUrl.protocol ? parsedUrl.protocol : '') +
    (parsedUrl.slashes ? '//' : '') +
    (parsedUrl.auth ? (parsedUrl.auth + '@') : '') +
    (parsedUrl.host ? parsedUrl.host : '') +
    (parsedUrl.port ? (':' + parsedUrl.port) : '');

  if(urlPortion.length > 0) {
    return urlPortion;
  }

  return undefined;
};

var transformPathsToAbsolute = function(paths, /*option*/basePath) {
  basePath = basePath || process.cwd();
  return paths.map(function(entryPoint) {
    return path.resolve(basePath, entryPoint);
  });
};





var renderLess = function(filePath, lessOpts) {
  lessOpts = lessOpts || {};
  return readFile(filePath, 'utf8')
    .then(function(data) {
      return less.render(data, lessOpts);
    });
};

var renderLessEntryPoints = function(entryPoints, lessOpts) {
  var renderPromiseMap = {};

  entryPoints.map(function(entryPoint) {
    renderPromiseMap[entryPoint] = renderLess(entryPoint, lessOpts);
  });

  return renderPromiseMap;
};


var buildEntryPoints = function(entryPoints, opts) {
  var renderMap = renderLessEntryPoints(entryPoints, opts.lessOptions);
  return Object.keys(renderMap)
    .map(function(entryPoint) {
      var renderPromise = renderMap[entryPoint];
      var parsedPath = pathUtils.parsePath(entryPoint);
      var destPathObject = _.extend({}, parsedPath, {
        ext: '.css',
        dir: path.resolve(__dirname, opts.dest)
      });
      var destPath = pathUtils.formatPath(destPathObject);

      return renderPromise
        .then(function(result) {
          result.source = entryPoint;
          return result;
        })
        .catch(function(err) {
          console.log('Error rendering:', entryPoint, err, err.stack);
        });
    });
};




var defaults = {
  lessOptions: {},
  watchGlob: undefined
};

var lessDefaults = {
  // see https://github.com/less/less-docs/blob/master/content/usage/programmatic-usage.md
  sourceMap: {}
};

var LessBuilder = function(entryPoints, options) {
  this.entryPoints = entryPoints;
  this.opts = _.extend({}, defaults, options);
  this.opts.lessOptions = _.extend({}, lessDefaults, this.opts.lessOptions);

  this.buildEmitter = new EventEmitter();

  this._watchHandle = null;
};

LessBuilder.prototype.getDepMap = function() {
  var depMap = this.depMap;

  if(!depMap) {
    var absoluteEntryPoints = transformPathsToAbsolute(this.entryPoints);

    depMap = {};
    var depMapGeneratedPromise = Promise.all(absoluteEntryPoints.map(function(entryPoint) {
      var depMapPromise = lessDependencyMapUtils.generateLessDependencyMap(entryPoint, this.opts.lessOptions);

      return depMapPromise
        .then(function(partialDepMap) {
          depMap = lessDependencyMapUtils.extendDepMaps(depMap, partialDepMap);
        });
    }.bind(this)));
  }

  this.depMap = depMap;
  return Promise.resolve(this.depMap);
};

LessBuilder.prototype.build = function() {
  var absoluteEntryPoints = transformPathsToAbsolute(this.entryPoints);
  var builds = buildEntryPoints(absoluteEntryPoints, this.opts);

  builds.forEach(function(build) {
    build.then(function(result) {
      this.buildEmitter.emit('build', result);
    }.bind(this));
  }.bind(this));

  return Promise.all(builds);

};

LessBuilder.prototype.startWatching = function(/*optional*/newWatchGlob) {
  console.log('Starting to watch Less');

  if(newWatchGlob) {
    this.opts.watchGlob = newWatchGlob;
  }

  var entryPoints = this.entryPoints;
  var opts = this.opts;

  this.getDepMap()
    .then(function(depMap) {
      //console.log('depMap', depMap);
      console.log('depMap has ' + Object.keys(depMap).length + ' keys.');

      return depMap;
    })
    .then(function(depMap) {
      this._watchHandle = chokidar.watch(opts.watchGlob).on('all', function(e, needleFile) {
        if(e === 'change') {
          console.log(e, needleFile);
          var needlePath = path.resolve(__dirname, needleFile);
          var absoluteEntryPoints = transformPathsToAbsolute(entryPoints);

          // TODO: Update depMap with any `@import` changes in the `needleFile`

          var affectedEntryPoints = lessDependencyMapUtils.getEntryPointsAffectedByFile(
            depMap,
            absoluteEntryPoints,
            needlePath
            //'/Users/eric/Documents/github/gitter-webapp/public/js/views/app/headerView.less'
            //'/Users/eric/Documents/github/gitter-webapp/public/less/colors.less'
          );
          console.log('affectedEntryPoints', affectedEntryPoints);

          Promise.all(buildEntryPoints(affectedEntryPoints, opts))
            .then(function() {
              console.log('Done building');
            });
        }
      });
    });

};

LessBuilder.prototype.stopWatching = function() {
  if(this._watchHandle) {
    this._watchHandle.close();
  }
};




module.exports = LessBuilder;
