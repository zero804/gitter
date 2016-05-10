'use strict';

var Marionette = require('backbone.marionette');

var CommunityCreationRepoListTemplate = require('./community-creation-repo-list-view.hbs');
var CommunityCreationRepoListItemView = require('./community-creation-repo-list-item-view');


var CommunityCreationRepoListView = Marionette.CompositeView.extend({
  template: CommunityCreationRepoListTemplate,
  childView: CommunityCreationRepoListItemView,
  childViewContainer: '.community-create-repo-list',
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
      this.trigger('repo:activated', view.model);
    }
    else {
      this.trigger('repo:cleared');
    }
  }
});

module.exports = CommunityCreationRepoListView;
