'use strict';

var template = require('./compile-web-template')('/js/views/menu/old/tmpl/org-list-item');
var prerenderWrapper = require('./prerender-wrapper');

module.exports = function (model) {
  var data = model;

  var inner = template(data);

  return prerenderWrapper({
    inner: inner,
    wrap: "li",
    dataId: model.id,
    className: "room-list-item"
  });
};
