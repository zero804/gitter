"use strict";

var componentRenderer = require('gitter-web-topics-ui');

module.exports = function topicComponentHelper(componentName, context){
  return '<div id="app-root">' + componentRenderer(componentName, context) + '</div>';
};
