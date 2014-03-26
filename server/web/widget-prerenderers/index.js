/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf      = require('../../utils/config');
var path       = require('path');
var fs         = require('fs');
var winston    = require('../../utils/winston');
var syncHandlebars = require('handlebars');
var SafeString = syncHandlebars.SafeString;

var baseDir = path.normalize(__dirname + '../../../../' + nconf.get('web:staticContent') + '/');
var widgetDir = path.normalize(baseDir + '/js/views/widgets/tmpl/');

var widgetHelpers = ['avatar','timeago'].reduce(function(memo, v) {
  var widgetTemplate;
  var handlerConstructor = require('./' + v);
  var handler;


  if(handlerConstructor.length === 1) {
    var buffer = fs.readFileSync(widgetDir + v + '.hbs');
    widgetTemplate = syncHandlebars.compile(buffer.toString());
    handler = handlerConstructor(widgetTemplate);
  } else {
    handler = handlerConstructor();
  }

  memo[v] = function() {
    var result = handler.apply(null, arguments);
    return new SafeString(result);
  };
  return memo;
  }, {});

function getWidgetHandler(widget) {
  var helper = widgetHelpers[widget];
  if(!helper) helper = function() {
    winston.warn('Unknown helper ' + widget);
    return "";
  };
  return helper;
}

module.exports = exports = {
  widget: function(widget, params) {
    return getWidgetHandler(widget)(params);
  }
};
