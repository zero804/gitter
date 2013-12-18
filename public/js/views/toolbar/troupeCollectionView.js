/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'utils/context',
  'marionette',
  'hbs!./tmpl/troupeListItem',
  'utils/appevents',
  'utils/momentWrapper'
], function(context, Marionette, troupeListItemTemplate, appEvents, moment) {
  "use strict";

  var createRoom = context.getUser().createRoom;

  var TroupeItemView = Marionette.ItemView.extend({
    tagName: 'li',
    template: troupeListItemTemplate,
    modelEvents: {
      change: 'render',
    },
    events: {
      click: 'clicked'
    },
    serializeData: function() {
      var data = this.model.toJSON();
      data.createRoom = createRoom;
      return data;
    },
    clicked: function(e) {
      e.preventDefault();

      // Make things feel a bit more responsive
      this.model.set('lastAccessTime', moment());

      appEvents.trigger('navigation', this.model.get('url'), 'chat', this.model.get('name'));
    }
  });

  return Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'trpTroupeList',
    itemView: TroupeItemView
  });

});
