'use strict';

var _ = require('underscore');
var urlJoin = require('url-join');
var clientEnv = require('gitter-client-env');

var template = require('./community-creation-invite-people-view.hbs');
var CommunityCreateBaseStepView = require('./community-creation-base-step-view');
var CommunityCreationPeopleListView = require('./community-creation-people-list-view');

var Typeahead = require('views/controls/typeahead');
var userSearchModels = require('collections/user-search');
var userSearchItemTemplate = require('views/app/tmpl/userSearchItem.hbs');

require('gitter-styleguide/css/components/headings.css');
require('gitter-styleguide/css/components/buttons.css');




module.exports = CommunityCreateBaseStepView.extend({
  template: template,

  attributes: _.extend({}, CommunityCreateBaseStepView.prototype.attributes, {
    class: 'community-create-step-wrapper community-create-invite-people-step-wrapper'
  }),

  behaviors: {
    Isomorphic: {
      orgListView: { el: '.community-create-invite-list-root', init: 'initInviteListView' },
    },
  },

  initInviteListView: function(optionsForRegion) {
    this.inviteListView = new CommunityCreationPeopleListView(optionsForRegion({
      collection: this.communityCreateModel.get('peopleToInvite')
    }));
    this.listenTo(this.inviteListView, 'person:remove', this.onPersonRemoved, this);
    return this.inviteListView;
  },

  ui: _.extend({}, CommunityCreateBaseStepView.prototype.ui, {
    peopleInput: '.primary-community-invite-people-name-input',
    inviteList: '.community-create-invite-list'
  }),

  events: _.extend({}, CommunityCreateBaseStepView.prototype.events, {
    'click @ui.nextStep': 'onStepNext',
    'click @ui.backStep': 'onStepBack',
  }),

  initialize: function(options) {
    CommunityCreateBaseStepView.prototype.initialize.apply(this, arguments);
  },

  setupPeopleTypahead: function() {
    this.typeahead = new Typeahead({
      collection: new userSearchModels.Collection(),
      el: this.ui.peopleInput[0],
      itemTemplate: userSearchItemTemplate,
      itemSerializeData: function() {
        var data = _.extend({}, this.model.toJSON());
        data.absoluteUri = urlJoin(clientEnv.basePath, this.model.get('username'));
        return data;
      },
      autoSelector: function(input) {
        return function(m) {
          var displayName = m.get('displayName');
          var username = m.get('username');

          return displayName && displayName.indexOf(input) >= 0 ||
            username && username.indexOf(input) >= 0;
        };
      }
    });

    this.listenTo(this.typeahead, 'selected', this.onPersonSelected);
  },

  onRender: function() {
    this.setupPeopleTypahead();
  },

  onDestroy: function() {
    this.typeahead.destroy();
  },

  onStepNext: function() {
    this.communityCreateModel.set('stepState', this.communityCreateModel.STEP_CONSTANT_MAP.overview);
  },
  onStepBack: function() {
    this.communityCreateModel.set('stepState', this.communityCreateModel.STEP_CONSTANT_MAP.main);
  },

  onPersonSelected: function(person) {
    this.communityCreateModel.get('peopleToInvite').add(person);
    this.typeahead.dropdown.hide();
    this.typeahead.clear();
  },

  onPersonRemoved: function(person) {
    this.communityCreateModel.get('peopleToInvite').remove(person);
  }
});
