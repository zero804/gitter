'use strict';
var template = require('../utils/compile-template')('/js/views/menu/tmpl/profile');
var _ = require('underscore');

module.exports = function (model) {
  var data = {
    user: {
      username: model.username
    },
    displayName: model.displayName
  };

  return template(data);
};
