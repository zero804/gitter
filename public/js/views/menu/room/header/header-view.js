'use strict';

var Marionette = require('backbone.marionette');
var template   = require('./header-view.hbs');
var RAF        = require('utils/raf');
var context    = require('utils/context');

module.exports = Marionette.ItemView.extend({

  template: template,

  modelEvents: {
    'change:state': 'updateActiveElement',
    'change:selectedOrgName': 'render'
  },

  events: {
    'click': 'onClick',
    'click #menu-panel-header-close': 'onCloseClicked',
  },

  ui: {
    headerAll:       '#panel-header-all',
    headerSearch:    '#panel-header-search',
    headerFavourite: '#panel-header-favourite',
    headerPeople:    '#panel-header-people',
    headerOrg:       '#panel-header-org',
  },

  serializeData: function() {
    return {
      user:    this.model.userModel.toJSON(),
      orgName: this.model.get('selectedOrgName'),
    };
  },

  updateActiveElement: function(model, state) { //jshint unused: true
    //This can be called after render so we need to add a small delay to get the transitions working
    //jp 6/12/16
    setTimeout(function() {
      RAF(function() {
        this.ui.headerAll.toggleClass('active', state === 'all');
        this.ui.headerSearch.toggleClass('active', state === 'search');
        this.ui.headerFavourite.toggleClass('active', state === 'favourite');
        this.ui.headerPeople.toggleClass('active', state === 'people');
        this.ui.headerOrg.toggleClass('active', state === 'org');
      }.bind(this));
    }.bind(this));
  },

  initialize: function (){
    this.listenTo(context.troupe(), 'change:id', this.render, this);
  },

  onRender: function() {
    this.updateActiveElement(this.model, this.model.get('state'));
  },

  onClick: function() {
    if(this.model.get('state') === 'all') {
      this.model.set('profileMenuOpenState', !this.model.get('profileMenuOpenState'));
    }
  },

  onCloseClicked: function(e) {
    if (this.model.get('roomMenuIsPinned')) return;
    e.stopPropagation();
    this.model.set({
      profileMenuOpenState: false,
      panelOpenState:       false,
    });
  },


});
