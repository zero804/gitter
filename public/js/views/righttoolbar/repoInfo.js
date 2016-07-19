"use strict";

var repoInfoTemplate = require('./tmpl/repoInfo.hbs');
var Marionette = require('backbone.marionette');
var backendUtils = require('../../utils/backend-utils');

module.exports = Marionette.ItemView.extend({

  template: repoInfoTemplate,

  modelEvents: {
    "change": "render"
  },

  initialize: function(options) {
    this.roomModel = options.roomModel;
    this.onRoomChange();

    this.listenTo(this.roomModel, 'change:backend', this.onRoomChange, this);
  },

  onRoomChange: function() {
    var linkPath = backendUtils.getLinkPathCond('GH_REPO', this.roomModel);
    this.triggerMethod('repoInfo:changeVisible', !!linkPath);

    if (!linkPath) {
      this.model.clear();
      return;
    }

    this.model.fetch({
      data: {
        repo: linkPath
      }
    });
  }

});
