'use strict';

var _ = require('underscore');
var template = require('./compile-web-template')('/js/views/menu/tmpl/room-list-item');

module.exports = function (model) {
  var data = _.extend(model, {
    owner: model.url.split('/')[1]
  });
  return template(data);
};
