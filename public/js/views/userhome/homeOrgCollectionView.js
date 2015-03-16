"use strict";

var Marionette = require('marionette');
var orgTemplate = require('./tmpl/home-org-view.hbs');
var orgListItemTemplate = require('./tmpl/homeOrgListItem.hbs');
var appEvents = require('utils/appevents');

module.exports = (function() {


  var OrgItemView = Marionette.ItemView.extend({
    tagName: 'li',
    className: 'suggested-room-list-item',
    template: orgListItemTemplate,
    modelEvents: {
      change: 'render'
    },
    serializeData: function() {
      return this.model.toJSON();
    },
    events: {
      click: 'navigate'
    },
    navigate: function() {
      var name = this.model.get('name');
      var url = '/' + name;
      appEvents.trigger('navigation', url, 'chat', name);
    }
  });

  return Marionette.CompositeView.extend({
    collectionEvents: {
      'add remove reset sync': 'onRender'
    },
    ui: {
      header: '#org-list-header'
    },
    childViewContainer: "#org-list-items",
    // tagName: 'ul',
    // className: 'suggested-room-list',
    template: orgTemplate,
    itemView: OrgItemView,
    onRender: function() {
      if(this.collection.length > 0) {
        this.ui.header.show();
      } else {
        this.ui.header.hide();
      }

    }
  });


})();

