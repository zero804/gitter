'use strict';
var _ = require('underscore');
var resolveIconClass = require('../../public/js/utils/resolve-icon-class');
var template = require('../utils/compile-template')('/js/views/menu/tmpl/room-list-item');

module.exports = function (model) {
  var data = _.extend(model, {
    iconClass: resolveIconClass(model)
  });
  return template(data);
};
