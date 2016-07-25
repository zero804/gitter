'use strict';

var Marionette = require('backbone.marionette');
var template = require('./header-view.hbs');
var fastdom = require('fastdom');
var toggleClass = require('utils/toggle-class');
var cocktail = require('cocktail');
var KeyboardEventMixin = require('views/keyboard-events-mixin');
var getOrgNameFromUri = require('gitter-web-shared/get-org-name-from-uri');


var HeaderView = Marionette.ItemView.extend({
  template: template,

  behaviors: {
    Tooltip: {
      '.js-left-menu-org-page-action': { placement: 'left' },
      '.js-profile-menu-toggle': { titleFn: function() {
        return 'Click to toggle the profile menu';
      }, placement: 'right' }
    }
  },

  modelEvents: {
    'change:state': 'updateActiveElement',
    'change:groupId': 'render',
    'change:profileMenuOpenState': 'onProfileToggle',
  },

  events: {
    'click':                          'toggleProfileMenuWhenAll',
    'click #menu-panel-header-close': 'onCloseClicked',
  },

  keyboardEvents: {
    'profile-menu.toggle': 'toggleProfileMenuWhenAll'
  },

  ui: {
    headerAll:       '#panel-header-all',
    headerSearch:    '#panel-header-search',
    headerFavourite: '#panel-header-favourite',
    headerPeople:    '#panel-header-people',
    headerOrg:       '#panel-header-org',
    profileToggle:   '#panel-header-profile-toggle',
  },

  initialize: function(attrs) {
    this.groupsCollection = attrs.groupsCollection;
  },

  serializeData: function() {
    var groupId = this.model.get('groupId');
    var selectedGroup = this.groupsCollection.get(groupId);
    var name = '';
    if(selectedGroup) { name = selectedGroup.get('name'); }
    else { name = getOrgNameFromUri(document.location.pathname); }
    return { orgName: name, };
  },

  updateActiveElement: function(model, state) { //jshint unused: true
    //This can be called after render so we need to add a small delay to get the transitions working
    //jp 6/12/16
    setTimeout(function() {
      fastdom.mutate(function() {
        toggleClass(this.ui.headerAll[0], 'active', state === 'all');
        toggleClass(this.ui.headerSearch[0], 'active', state === 'search');
        toggleClass(this.ui.headerFavourite[0], 'active', state === 'favourite');
        toggleClass(this.ui.headerPeople[0], 'active', state === 'people');
        toggleClass(this.ui.headerOrg[0], 'active', (state === 'org' || state === 'temp-org'));
      }.bind(this));
    }.bind(this));
  },


  toggleProfileMenuWhenAll: function() {
    //Open the profile menu ONLY when in the all channels state
    if (this.model.get('state') === 'all') {
      this.model.set('profileMenuOpenState', !this.model.get('profileMenuOpenState'));
    }
  },

  onRender: function() {
    this.updateActiveElement(this.model, this.model.get('state'));
  },


  //TODO CHECK IF THIS CAN BE REMOVED JP 27/1/16
  onCloseClicked: function(e) {
    if (this.model.get('roomMenuIsPinned')) return;
    e.stopPropagation();
    this.model.set({
      profileMenuOpenState: false,
      panelOpenState:       false,
    });
  },

  onProfileToggle: function(model, val) { //jshint unused: true
    toggleClass(this.ui.profileToggle[0], 'active', !!val);
    this.el.setAttribute('aria-expanded', !!val);
  },

  onDestroy: function() {
    this.stopListening(this.model.primaryCollection);
  },

});

cocktail.mixin(HeaderView, KeyboardEventMixin);

module.exports = HeaderView;
