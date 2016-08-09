'use strict';

var _ = require('underscore');

var stepConstants = require('../step-constants');
var template = require('./community-creation-invite-confirmation-view.hbs');
var CommunityCreateBaseStepView = require('../shared/community-creation-base-step-view');
var CommunityCreationTroublePeopleListView = require('../shared/community-creation-expanded-people-list-view');


require('gitter-styleguide/css/components/headings.css');
require('gitter-styleguide/css/components/buttons.css');


var _super = CommunityCreateBaseStepView.prototype;

module.exports = CommunityCreateBaseStepView.extend({
  template: template,

  className: 'community-create-step-wrapper community-create-invite-confirmation-step-wrapper',

  behaviors: {
    Isomorphic: {
      troubleInviteListView: { el: '.community-create-trouble-invite-list-root', init: 'initTroubleInviteListView' }
    },
  },

  initTroubleInviteListView: function(optionsForRegion) {
    this.troubleInviteListView = new CommunityCreationTroublePeopleListView(optionsForRegion({
      collection: this.troubleInviteCollection,
      communityCreateModel: this.communityCreateModel
    }));
    return this.troubleInviteListView;
  },

  ui: _.extend({}, _super.ui, {
    allowTweetBadgerOptionInput: '.js-community-create-allow-tweet-badger-option-input'
  }),

  events: _.extend({}, _super.events, {
    'click @ui.nextStep': 'onStepNext',
    'click @ui.backStep': 'onStepBack',
    'change @ui.allowTweetBadgerOptionInput': 'onAllowTweetBadgerInputChange'
  }),

  initialize: function(options) {
    _super.initialize.apply(this, arguments);

    this.troubleInviteCollection = options.troubleInviteCollection;
  },

  serializeData: function() {
    var data = _.extend({}, this.model.toJSON());

    return data;
  },

  onStepNext: function() {
    this.communityCreateModel.set('stepState', stepConstants.OVERVIEW);
  },
  onStepBack: function() {
    this.communityCreateModel.set('stepState', stepConstants.INVITE);
  },

  onAllowTweetBadgerInputChange: function() {
    this.communityCreateModel.set('allowTweetBadger', this.ui.allowTweetBadgerOptionInput[0].checked);
  },
});
