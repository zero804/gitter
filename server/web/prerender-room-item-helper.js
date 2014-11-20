'use strict';
console.log('__dirname:', __dirname);
var ensurePojo = require('../../public/js/utils/ensure-pojo');
var resolveIconClass = require('../../public/js/utils/resolve-icon-class');
var _ = require('underscore');
var template = require('../utils/compile-template')('/js/views/menu/tmpl/room-list-item');

module.exports = function (model) {
  model = ensurePojo(model);
  var data = _.extend(model, {
    iconClass: resolveIconClass(model)
  });
  return template(data);
};
