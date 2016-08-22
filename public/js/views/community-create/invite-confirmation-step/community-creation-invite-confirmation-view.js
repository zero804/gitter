'use strict';

var _ = require('underscore');
var stepConstants = require('../step-constants');
var template = require('./community-creation-invite-confirmation-view.hbs');
var CommunityCreateBaseStepView = require('../shared/community-creation-base-step-view');
var ExpandedPeopleListView = require('../shared/community-creation-expanded-people-list-view');

require('gitter-styleguide/css/components/headings.css');
require('gitter-styleguide/css/components/buttons.css');


var _super = CommunityCreateBaseStepView.prototype;

module.exports = CommunityCreateBaseStepView.extend({
  template: template,

  className: 'community-create-step-wrapper community-create-invite-confirmation-step-wrapper',
  nextStep: stepConstants.OVERVIEW,
  prevStep: stepConstants.INVITE,
  behaviors: {
    Isomorphic: {
      troubleInviteListView: { el: '.community-create-trouble-invite-list-root', init: 'initTroubleInviteListView' }
    },
  },

  initTroubleInviteListView: function(optionsForRegion) {
    this.troubleInviteListView = new ExpandedPeopleListView(optionsForRegion({
      collection: this.communityCreateModel.invites,
      // Only show invites without an email address
      communityCreateModel: this.communityCreateModel
    }));

    return this.troubleInviteListView;
  },

  ui: _.extend({}, _super.ui, {
    allowTweetBadgerOptionInput: '.js-community-create-allow-tweet-badger-option-input'
  }),

  events: _.extend({}, _super.events, {
    'change @ui.allowTweetBadgerOptionInput': 'onAllowTweetBadgerInputChange'
  }),

  onActiveChange: function() {
    _super.onActiveChange.call(this);
    if (this.troubleInviteListView) {
      this.troubleInviteListView.resortView();
    }
  },

  onAllowTweetBadgerInputChange: function() {
    this.communityCreateModel.set('allowTweetBadger', this.ui.allowTweetBadgerOptionInput[0].checked);
  },
});
