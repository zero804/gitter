"use strict";

var path = require('path');
var React = require('react');

var componentPath;
var suffix;

if (process.env.NODE_ENV === 'dev') {
  var babelRegister = require("babel-register");  // eslint-disable-line node/no-unpublished-require
  var babelConfig = require('../dev/babel-config');
  babelRegister(babelConfig);

  // Hotswapping of JSX modules
  var hotswapReloader = require('../dev/hotswap-reloader');
  hotswapReloader(path.resolve(__dirname, '..', 'containers'), function() {
    factories = {};
  });

  componentPath = 'containers';
  suffix = '.jsx';
} else {
  componentPath = 'containers-compiled';
  suffix = '';
}

var factories = {};

function getComponent(componentName) {
  if (factories[componentName]) {
    return factories[componentName];
  }

  var component = require(path.resolve(__dirname, '..', componentPath, componentName + suffix));
  var Component = factories[componentName] = React.createFactory(component);

  return Component;
}

module.exports = getComponent;
