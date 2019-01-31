'use strict';

var Marionette = require('backbone.marionette');
var orgTemplate = require('./tmpl/home-org-view.hbs');
var orgListItemTemplate = require('./tmpl/homeOrgListItem.hbs');

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
    }
  });

  return Marionette.CompositeView.extend({
    collectionEvents: {
      'add remove reset sync': 'onRender'
    },
    ui: {
      header: '#org-list-header'
    },
    childViewContainer: '#org-list-items',
    template: orgTemplate,
    childView: OrgItemView,
    onRender: function() {
      if (this.collection.length > 0) {
        this.ui.header.show();
      } else {
        this.ui.header.hide();
      }
    }
  });
})();
