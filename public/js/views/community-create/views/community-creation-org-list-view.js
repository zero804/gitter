'use strict';

var Marionette = require('backbone.marionette');

var CommunityCreationOrgListTemplate = require('./community-creation-org-list-view.hbs');
var CommunityCreationOrgListItemView = require('./community-creation-org-list-item-view');

var CommunityCreationOrgListView = Marionette.CompositeView.extend({
  template: CommunityCreationOrgListTemplate,
  childView: CommunityCreationOrgListItemView,
  childViewContainer: '.community-create-org-list',
  childEvents: {
    'item:activated': 'onItemActivated'
  },

  onItemActivated: function(view) {
    var newActiveValue = !view.model.get('active');

    var previousActiveModel = this.collection.findWhere({ active: true });
    if(previousActiveModel) {
      previousActiveModel.set('active', false);
    }
    // Toggle active
    view.model.set('active', newActiveValue);
    if(newActiveValue) {
      this.trigger('org:activated', view.model);
    }
    else {
      this.trigger('org:cleared');
    }
  }
});

module.exports = CommunityCreationOrgListView;
