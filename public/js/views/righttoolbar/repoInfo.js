"use strict";

var repoInfoTemplate = require('./tmpl/repoInfo.hbs');
var Marionette = require('marionette');

module.exports = Marionette.ItemView.extend({
  template: repoInfoTemplate,
  modelEvents: {
    "change": "render"
  }
});
