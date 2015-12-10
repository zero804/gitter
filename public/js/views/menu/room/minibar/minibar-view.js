'use strict';

var Marionette       = require('backbone.marionette');
var Backbone         = require('backbone');
var RoomMenuItemView = require('./minibar-item-view');

require('nanoscroller');

var MiniBarView = Marionette.ItemView.extend({

  events: {
    'click #menu-close-button': 'onCloseButtonClicked',
  },

  initialize: function() {
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

      var view = new RoomMenuItemView({ model: model, el: el });
      this.roomMenuItems.push(view);

      this.listenTo(view, 'room-item-view:clicked', this.onItemClicked, this);

    }.bind(this));

    this.listenTo(this.model, 'change:panelOpenState', this.onPanelStateChange, this);

    this.$el.find('.nano').nanoScroller({
      iOSNativeScrolling: true,
      sliderMaxHeight:    200,
    });

  },

  onItemClicked: function(type, orgName) {
    //deactive the old active item
    var currentActiveModel = this._getCurrentlyActiveChildModel();
    if (!!currentActiveModel) currentActiveModel.set('active', false);

    //activate the next item
    var query = !!orgName ? { orgName: orgName } : { type: type };
    var nextActiveModel = this.roomMenuItemModels.where(query)[0];
    if (!!nextActiveModel) nextActiveModel.set('active', true);

    this.model.set({
      panelOpenState: true,
      state: type,
      profileMenuOpenState: false,
      selectedOrgName: orgName,
    });
  },

  onPanelStateChange: function(model, state) {/*jshint unused:true */
    this.$el.find('#menu-close-button').toggleClass('active', state);
    if (!state) {
      var currentActiveModel = this._getCurrentlyActiveChildModel();
      currentActiveModel.set('active', false);
    }
  },

  onCloseButtonClicked: function(e) {
    e.stopPropagation();
    this.model.set('panelOpenState', false);
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

module.exports = MiniBarView;
