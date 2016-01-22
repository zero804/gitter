'use strict';

var Marionette          = require('backbone.marionette');
var Backbone            = require('backbone');
var RoomMenuItemView    = require('./minibar-item-view');
var cocktail            = require('cocktail');
var KeyboardEventsMixin = require('views/keyboard-events-mixin');

require('nanoscroller');

var MiniBarView = Marionette.ItemView.extend({

  keyboardEvents: {
     'room.1 room.2 room.3 room.4 room.5 room.6 room.7 room.8 room.9': 'onKeypressFocus',
  },

  initialize: function(attrs) {

    if (!attrs || !attrs.bus) {
      throw new Error('A valid event bus must be passed to a new instance of the MiniBarView');
    }

    this.bus = attrs.bus;

    if (!attrs || !attrs.dndCtrl)  {
      throw new Error('A valid drag & drop controller must be passed to a new instance of the MiniBarView');
    }

    this.dndCtrl = attrs.dndCtrl;

    this.roomMenuItems = [];
    this.roomMenuItemModels = new Backbone.Collection();

    //Feels icky to pull this out of the dom
    //but we have to because it's pre rendered
    //and not stored in the context
    var _roomMenuItems = Array.prototype.slice.apply(this.$el.find('[data-state-change]'));
    _roomMenuItems.forEach(function(el, index) {

      var type = el.dataset.stateChange;

      var model = new Backbone.Model({ active: (index === 0), type: type });
      this.roomMenuItemModels.add(model);

      var view = new RoomMenuItemView({
        model:   model,
        el:      el,
        bus:     attrs.bus,
        dndCtrl: this.dndCtrl,
        menuModel: this.model,
      });
      this.roomMenuItems.push(view);

      this.listenTo(view, 'room-item-view:clicked', this.onItemClicked, this);

    }.bind(this));

    this.listenTo(this.model, 'change:panelOpenState', this.onPanelStateChange, this);
    this.listenTo(this.model, 'change', this.onMenuChange, this);

    this.$el.find('.nano').nanoScroller({
      iOSNativeScrolling: true,
      sliderMaxHeight:    200,
    });

  },

  //TODO this sequencing is not 100% decided upon
  //when it is the login needs to be tests
  //JP 12/1/16
  onItemClicked: function(type, orgName, isCloseButton) {
    if (isCloseButton) {
      var newVal = !this.model.get('roomMenuIsPinned');
      var ANIMATION_TIME = 300;

      //if we are opening the panel
      if (newVal === true) {
        if (this.model.get('panelOpenState') === true) {
          this.model.set({ roomMenuIsPinned: newVal });
          this.bus.trigger('room-menu:pin', newVal);
        } else {
          setTimeout(function() {
            this.model.set({ roomMenuIsPinned: newVal });
            this.bus.trigger('room-menu:pin', newVal);
          }.bind(this), ANIMATION_TIME);
        }

        this.model.set({ panelOpenState: newVal });
      } else {
        this.model.set({ roomMenuIsPinned: newVal });
        this.bus.trigger('room-menu:pin', newVal);
        setTimeout(function() {
          this.model.set({ panelOpenState: newVal });
        }.bind(this), ANIMATION_TIME);
      }
    }

    //If the pin button is clicked retain the current state
    if (type === 'pin') { type = this.model.get('state') }

    if (!orgName) { orgName = this.model.get('selectedOrgName') }

    this.model.set({
      panelOpenState:       true,
      state:                type,
      profileMenuOpenState: false,
      selectedOrgName:      orgName,
    });
  },

  onPanelStateChange: function(model, state) {/*jshint unused:true */
    this.$el.find('#menu-close-button').toggleClass('active', state);
    if (!state) {
      var currentActiveModel = this._getCurrentlyActiveChildModel();
      if (currentActiveModel) currentActiveModel.set('active', false);
    }
  },

  onMenuChange: function() {

    var orgName = this.model.get('selectedOrgName');
    var type    = this.model.get('state');

    if (!this.model.get('panelOpenState')) { return }

    //de-activate the old active item
    var currentActiveModel = this._getCurrentlyActiveChildModel();
    if (!!currentActiveModel) currentActiveModel.set('active', false);

    //activate the next item
    var query = (type === 'org') ? { orgName: orgName } : { type: type };
    var nextActiveModel = this.roomMenuItemModels.where(query)[0];
    if (!!nextActiveModel) nextActiveModel.set('active', true);

  },

  //TODO this feals too much like the above function, start extracting the functionality
  onKeypressFocus: function(e, handler) {//jshint unused: true
    console.log('this is wokring');
    var index = handler.key.split('+').slice(-1)[0];
    index = parseInt(index, 10) - 1;
    var nextActiveModel = this.roomMenuItemModels.at(index);
    if (!nextActiveModel) { return }

    this.onItemClicked(nextActiveModel.get('type'), nextActiveModel.get('orgName'), false);
    this.bus.trigger('room-menu:keyboard:focus');
    this.bus.trigger('focus.request.out', e);
  },

  _getCurrentlyActiveChildModel: function() {
    return this.roomMenuItemModels.where({ active: true })[0];
  },

  destroy: function() {
    //unbind all child views
    this.roomMenuItems.forEach(function(v) {
      this.stopListening(v);
    }.bind(this));

    //call super
    Marionette.ItemView.prototype.destroy.apply(this, arguments);
  },

});

cocktail.mixin(MiniBarView, KeyboardEventsMixin);

module.exports = MiniBarView;
