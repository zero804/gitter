"use strict";
var roomNameTrimmer = require('utils/room-name-trimmer');
var resolveIconClass = require('utils/resolve-icon-class');
var Marionette = require('marionette');
var suggestedListItemTemplate = require('./tmpl/suggested-list-item.hbs');
var appEvents = require('utils/appevents');

module.exports = (function() {

  var SuggestedItemView = Marionette.ItemView.extend({

    tagName: 'li',

    className: 'room-list-item',

    template: suggestedListItemTemplate,

    modelEvents: {
      change: 'render',
    },

    events: {
      click: 'clicked'
    },

    serializeData: function() {
      var data = this.model.toJSON();
      data.uri = roomNameTrimmer(data.uri);
      data.repoTypeClass = resolveIconClass(data);
      return data;
    },

    clicked: function(e) {
      e.preventDefault();
      if(this.model.get('exists')) {
        appEvents.trigger('navigation', '/' + this.model.get('uri'), 'chat', this.model.get('uri'), null);
      } else {
        parent.location.hash = '#confirm/' + this.model.get('uri');
      }
    }
  });

  return Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'room-list',
    itemView: SuggestedItemView
  });


})();

