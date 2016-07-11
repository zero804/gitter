'use strict';

var CommunityCreationOrgListTemplate = require('./community-create-invite-user-result-list-view.hbs');
var InviteUserResultListItemView = require('./community-create-invite-user-result-list-item-view');


var Marionette = require('backbone.marionette');

var InviteUserResultListView = Marionette.CompositeView.extend({
  className: 'community-create-invite-user-result-list-root-inner',
  template: CommunityCreationOrgListTemplate,
  childView: InviteUserResultListItemView,
  childViewContainer: '.community-create-invite-user-result-list',
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
      this.trigger('user:activated', view.model);
    }
    else {
      this.trigger('user:cleared');
    }
  }

});

module.exports = InviteUserResultListView;
