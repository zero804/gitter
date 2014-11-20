'use strict';
var template = require('../utils/compile-template')('/js/views/menu/tmpl/profile');
var _ = require('underscore');

module.exports = function (model) {
  var data = _.extend(model, { user: { username: 'waltfy' }, displayName: 'Walter Carvalho' });
  return template(data);
};
