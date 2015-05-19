"use strict";

var context = require('utils/context');
var Marionette = require('backbone.marionette');
var orgListItemTemplate = require('./tmpl/org-list-item.hbs');
var appEvents = require('utils/appevents');

module.exports = (function() {


  var OrgItemView = Marionette.ItemView.extend({
    tagName: 'li',

    className: 'room-list-item',

    template: orgListItemTemplate,

    modelEvents: {
      change: 'render',
    },

    events: {
      click: 'clicked'
    },

    serializeData: function() {
      var data = {};
      data.org = this.model.toJSON();
      data.user = context.getUser();
      return data;
    },

    clicked: function(e) {
      e.preventDefault();
      appEvents.trigger('navigation', '/' + this.model.get('name'), 'chat', this.model.get('name'), null);
    }
  });

  return Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'room-list',
    childView: OrgItemView,
    childViewOptions: function (item) {
      var options = {};
      if (item) {
        var id = item.get('id'); // NB ID attribute is not the id!
        options.el = this.$el.find('.room-list-item[data-id="' + id + '"]')[0];
      }
      return options;
    },

  });


})();
