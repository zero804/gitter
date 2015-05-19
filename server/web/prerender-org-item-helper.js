'use strict';

// TODO: deleteme
var template = require('./compile-web-template')('/js/views/menu/tmpl/org-list-item');

module.exports = function (model) {
  return template({ org: model });
};
