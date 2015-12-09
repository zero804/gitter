'use strict';

var Marionette = require('backbone.marionette');
var template   = require('./header-view.hbs');

module.exports = Marionette.ItemView.extend({

  template: template,

  modelEvents: {
    'change:state': 'render',
    'change:selectedOrgName': 'render',
    'change:roomMenuIsPinned': 'onPinStateChange'
  },

  events: {
    'click': 'onClick',
    'click #menu-panel-header-close': 'onCloseClicked'
  },

  serializeData: function() {
    var state = this.model.get('state');
    return {
      isAllState: (state === 'all'),
      isSearchState: (state === 'search'),
      isFavouriteState: (state === 'favourite'),
      isPeopleState: (state === 'people'),
      isOrgState: (state ===  'org'),
      user: this.model.userModel.toJSON(),
      orgName: this.model.get('selectedOrgName')
    };
  },

  onClick: function (){
    this.model.set('profileMenuOpenState', !this.model.get('profileMenuOpenState'));
  },

  onCloseClicked: function (e){
    if(this.model.get('roomMenuIsPinned')) return;
    e.stopPropagation();
    this.model.set({
      profileMenuOpenState: false,
      panelOpenState:       false
    });
  },

  onPinStateChange: function (model, val){ /*jshint unused: true */
    this.$el.find('#menu-panel-header-close').toggleClass('active', !val);
  },

});
