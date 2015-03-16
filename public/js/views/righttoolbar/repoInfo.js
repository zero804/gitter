"use strict";

var repoInfoTemplate = require('./tmpl/repoInfo.hbs');
var Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({
  template: repoInfoTemplate,
  modelEvents: {
    "change": "render"
  }
});
