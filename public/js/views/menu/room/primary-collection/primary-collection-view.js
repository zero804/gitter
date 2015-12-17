'use strict';

var $          = require('jquery');
var Marionette = require('backbone.marionette');
var RAF        = require('utils/raf');
var ItemView   = require('./primary-collection-item-view');
var dragula    = require('dragula');


//TODO MOVE ALL DRAGGABLE THINGS INTO A ROOM-MENU-DRAG-CONTROLLER
////AND WRITE TESTS FOR IT
module.exports = Marionette.CollectionView.extend({
  childEvents: {
    'item:clicked': 'onItemClicked',
  },
  childView: ItemView,
  initialize: function(options) {

    if (!options || !options.bus) {
      throw new Error('A valid event bus must be passed to a new PrimaryCollectionView');
    }

    this.bus     = options.bus;
    this.model   = options.model;
    this.dndCtrl = options.dndCtrl;

    //TODO turn this inot an error
    if(this.dndCtrl)this.dndCtrl.pushContainer(this.el);

    this.listenTo(this.model, 'change:state', this.onModelStateChange, this);
    this.listenTo(this.model, 'change:selectedOrgName', this.onModelStateChange, this);
  },

  filter: function(model) {
    var state   = this.model.get('state');
    var orgName = this.model.get('selectedOrgName');

    if (state === 'org' && orgName === '') {
      throw new Error('Room Menu Model is in the org state with no selectedOrgName');
    }

    switch (state) {

      case 'org':
        var name = model.get('name').split('/')[0];
        return (name === orgName) && !!model.get('roomMember');

      case 'favourite':
        return !!model.get('favourite');

      case 'people':
        return model.get('githubType') === 'ONETOONE';

      //should no show no results when in the search state
      case 'search':
        return false;

      //show all models in the deffault state
      default:
        return true;
    }
  },

  onModelStateChange: function(model, val) { /*jshint unused: true*/
    this.render();
    RAF(function() {
      this.$el.toggleClass('active', (val !== 'search'));
    }.bind(this));
  },

  onItemClicked: function(view) {
    var viewModel = view.model;
    var name = viewModel.get('name');
    var url = '/' + name;

    //If thr room menu is pinned dont try to close the pannel
    if (!this.model.get('roomMenuIsPinned')) {
      this.model.set('panelOpenState', false);
    }

    setTimeout(function() {
      this.bus.trigger('navigation', url, 'chat', name);
    }.bind(this), 250);
  },

});
