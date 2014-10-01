define([
  'utils/context',
  'utils/room-name-trimmer',
  'marionette',
  'hbs!./tmpl/suggested-list-item',
  'utils/appevents'
], function(context, roomNameTrimmer, Marionette, suggestedListItemTemplate, appEvents) {
  "use strict";

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
      return data;
    },

    clicked: function(e) {
      e.preventDefault();
      appEvents.trigger('navigation', '/' + this.model.get('uri'), 'chat', this.model.get('uri'), null);
    }
  });

  return Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'room-list',
    itemView: SuggestedItemView
  });

});
