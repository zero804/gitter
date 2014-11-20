'use strict';
var template = require('../utils/compile-template')('/js/views/menu/tmpl/org-list-item');

module.exports = function (model) {
  return template({ org: model });
};
