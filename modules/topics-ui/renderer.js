"use strict";

var path = require('path');
var reactDomServer = require('react-dom/server');

module.exports = function(componentName, context){

  //Require a component built with webpack
  var component = require(path.resolve(__dirname, './output', componentName));

  //Do some stupid stuff because we don't use jsx on the server like sane people
  //https://facebook.github.io/react/blog/2014/10/14/introducing-react-elements.html#react-without-jsx
  var Component = React.createFactory(component);

  //Return the rendered component with a given context
  return reactDomServer.renderToString(Component(context));
};
