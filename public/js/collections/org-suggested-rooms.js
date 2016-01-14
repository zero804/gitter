'use strict';

var Backbone            = require('backbone');
var backboneUrlResolver = require('backbone-url-resolver');

module.exports = Backbone.Collection.extend({
  initialize: function(models, attrs) {//jshint unused: true

    if (!attrs || !attrs.contextModel) {
      throw new Error('A valid model must be passed to SuggestedOrgCollection when initialized');
    }

    this.contextModel = attrs.contextModel;
    this.urlModel = backboneUrlResolver('/api/v1/orgs/:selectedOrgName/suggestedRooms', this.contextModel);
    this.listenTo(this.contextModel, 'change:selectedOrgName', this.onOrgNameUpdate, this);
  },

  url: function() {
    return this.urlModel.get('url');
  },

  onOrgNameUpdate: function(model, val) {//jshint unused: true
    if (!val || val  === '') return;
    this.fetch({ reset: true });
  },
});
