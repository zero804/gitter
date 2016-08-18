"use strict";

var path = require('path');
var React = require('react');

var suffix;

if (process.env.NODE_ENV === 'dev') {
  var babelRegister = require("babel-register");  // eslint-disable-line node/no-unpublished-require
  var babelConfig = require('../dev/babel-config');
  babelRegister(babelConfig);

  // Hotswapping of JSX modules
  var hotswapReloader = require('../dev/hotswap-reloader');
  hotswapReloader(path.resolve(__dirname, '..', 'shared', 'containers'), function() {
    factories = {};
  });

  suffix = '.jsx';
} else {
  suffix = '';
}

var factories = {};

function getComponent(componentName) {
  if (factories[componentName]) {
    return factories[componentName];
  }

  var component = require('../shared/containers/' + componentName + suffix);
  var Component = factories[componentName] = React.createFactory(component);

  return Component;
}

module.exports = getComponent;
