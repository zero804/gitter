/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var winston    = require('winston');
var nconf      = require('../utils/config');
var path       = require('path');
var fs         = require('fs');
var handlebars = require('consolidate').handlebars;
var syncHandlebars = require('handlebars');
var _          = require('underscore');

var baseDir = path.normalize(__dirname + '/../../' + nconf.get('web:staticContent') + '/');
var widgetDir = path.normalize(baseDir + '/js/views/widgets/tmpl/');


var widgetHelpers = ['avatar'].reduce(function(memo, v) {
  var buffer = fs.readFileSync(widgetDir + v + '.hbs');

  var widgetTemplate = syncHandlebars.compile( buffer.toString());
  memo[v] = require('./widget-prerenderers/' + v)(widgetTemplate);
  return memo;
  }, {});

function getWidgetHandler(widget) {
  var helper = widgetHelpers[widget];
  if(!helper) helper = function() { return ""; };
  return helper;
}

var helpers = {
  widget: function(widget, params) {
    getWidgetHandler(widget)(params);
  }
};

module.exports = exports = function(template, callback) {

  handlebars(baseDir + template + '.hbs', _.extend({}, this, { helpers: helpers, cache: nconf.get('web:cacheTemplates') }), function(err, result) {
    if(err) {
      winston.error("Unabe to prerender: " + err, { exception: err });
      return callback("");
    }

    callback(result);

  });

};