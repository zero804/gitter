"use strict";

var componentRenderer = require('gitter-web-topics-ui');

module.exports = function topicComponentHelper(componentName, context){
  return componentRenderer(componentName, context);
};
