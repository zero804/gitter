'use strict';

var template = require('./compile-web-template')('/js/views/menu/old/tmpl/room-list-item');

module.exports = function (model) {
  var data = model;
  return template(data);
};
