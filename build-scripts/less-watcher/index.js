var Promise = require('bluebird');
var _ = require('underscore');
var path = require('path');
var url = require('url');

var EventEmitter = require('events').EventEmitter;
var chokidar = require('chokidar');

var lessDependencyMapUtils = require('./lib/less-dependency-map-utils');


var transformPathsToAbsolute = function(paths, /*option*/basePath) {
  paths = [].concat(paths);
  basePath = basePath || process.cwd();
  return paths.map(function(entryPoint) {
    return path.resolve(basePath, entryPoint);
  });
};





var defaults = {
  lessOptions: {},
  watchGlob: undefined
};

var LessWatcher = function(entryPoints, options) {
  this.entryPoints = entryPoints;
  this.opts = _.extend({}, defaults, options);

  this.affectedEmitter = new EventEmitter();

  this.watchHandle = null;
};

LessWatcher.prototype.getDepMap = function() {
  var depMap = this.depMap;

  if(!depMap) {
    var absoluteEntryPoints = transformPathsToAbsolute(this.entryPoints);
    var lessOptions = this.opts.lessOptions;

    depMap = {};
    var depMapGeneratedPromise = Promise.all(absoluteEntryPoints.map(function(entryPoint) {
      var depMapPromise = lessDependencyMapUtils.generateLessDependencyMap(entryPoint, lessOptions);

      return depMapPromise
        .then(function(partialDepMap) {
          depMap = lessDependencyMapUtils.extendDepMaps(depMap, partialDepMap);
        });
    }.bind(this)));

    return depMapGeneratedPromise
      .then(function() {
        return depMap;
      });
  }

  this.depMap = depMap;
  return Promise.resolve(this.depMap);
};

LessWatcher.prototype.startWatching = function(/*optional*/newWatchGlob) {
  console.log('Starting to watch Less');

  if(newWatchGlob) {
    this.opts.watchGlob = newWatchGlob;
  }

  var entryPoints = this.entryPoints;
  var opts = this.opts;
  var affectedEmitter = this.affectedEmitter;

  this.getDepMap()
    .then(function(depMap) {
      //console.log('depMap', depMap);
      console.log('depMap has ' + Object.keys(depMap).length + ' keys.');

      return depMap;
    })
    .then(function(depMap) {
      this.watchHandle = chokidar.watch(opts.watchGlob).on('all', function(e, needleFile) {
        if(e === 'change') {
          console.log(e, needleFile);
          var needlePath = path.resolve(process.cwd(), needleFile);
          var absoluteEntryPoints = transformPathsToAbsolute(entryPoints);

          // TODO: Update depMap with any `@import` changes in the `needleFile`

          var affectedEntryPoints = lessDependencyMapUtils.getEntryPointsAffectedByFile(
            depMap,
            absoluteEntryPoints,
            needlePath
            //'/Users/eric/Documents/github/gitter-webapp/public/js/views/app/headerView.less'
            //'/Users/eric/Documents/github/gitter-webapp/public/less/colors.less'
          );

          affectedEmitter.emit('change', affectedEntryPoints);
        }
      });
    });

};

LessWatcher.prototype.stopWatching = function() {
  if(this.watchHandle) {
    this.watchHandle.close();
  }
};


// A nice wrapper so we don't have to use `new` in client code
module.exports = function() {
  var watcher = new (Function.prototype.bind.apply(LessWatcher, [null].concat(Array.prototype.slice.call(arguments))));

  return watcher;
};
