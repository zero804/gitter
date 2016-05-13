'use strict';

var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var toggleClass = require('utils/toggle-class');

var CommunityCreationEmailListTemplate = require('./community-creation-email-list-view.hbs');
var CommunityCreationEmailListItemTemplate = require('./community-creation-email-list-item-view.hbs');


var CommunityCreationEmailListItemView = Marionette.ItemView.extend({
  template: CommunityCreationEmailListItemTemplate,
  tagName: 'li',
  attributes: {
    class: 'community-create-email-list-item'
  },

  ui: {
    link: '.community-create-email-list-item-link',
    removeButton: '.community-create-email-list-item-remove-button'
  },

  events: {
    'click @ui.link': 'onLinkClick'
  },

  triggers: {
    'click @ui.removeButton': 'item:remove'
  },

  initialize: function(options) {
    this.model.set('canRemove', options.canRemove);
  },

  onActiveChange: function() {
    toggleClass(this.$el[0], 'active', this.model.get('active'));
  },

  onLinkClick: function(e) {
    e.preventDefault();
    e.stopPropagation();
  }
});

var CommunityCreationEmailListView = Marionette.CompositeView.extend({
  model: new Backbone.Model(),

  template: CommunityCreationEmailListTemplate,
  childView: CommunityCreationEmailListItemView,
  childViewContainer: '.community-create-email-list',
  childViewOptions: function() {
    return {
      canRemove: this.model.get('canRemove')
    };
  },
  childEvents: {
    'item:remove': 'onItemRemoved'
  },

  onItemRemoved: function(view) {
    this.trigger('email:remove', view.model);
  }
});

module.exports = CommunityCreationEmailListView;
