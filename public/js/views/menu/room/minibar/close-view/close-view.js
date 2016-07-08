'use strict';

var _ = require('underscore');
var toggleClass = require('utils/toggle-class');
var template = require('./close-view.hbs');
var ItemView = require('../minibar-item-view.js');

var defaults = {
  pinStateClass: 'is-menu-pinned',
  extraMouseOverElement: null,
  width: 30,
  height: 24,
  deflection: 5,
  strokeWidth: 2
};


var legDefaults = _.extend({}, defaults, {
  offsetY: 0
});

// `t` is a value from 0 to 1 representing the amount of deflection
// `dir` is the direction the arrow is pointing
var getDeflectedLegDescription = function(options, dir, t) {
  var opts = _.extend({}, legDefaults, options);
  var actualDeflection = t * opts.deflection;

  var pathDescription = 'M0,'+opts.offsetY + ' l'+(opts.width/2)+','+ (-1 * dir * actualDeflection) + ' l'+(opts.width/2)+',' + (dir * actualDeflection);

  return pathDescription;
};

// `t` is a value from 0 to 1 representing the amount of deflection
var getFirstLegDescription = function(options, t) {
  var opts = _.extend({}, legDefaults, options);
  var newOpts = _.extend({}, opts, {
    offsetY: opts.offsetY + (opts.deflection + (opts.strokeWidth/2))
  });
  var pathDescription = getDeflectedLegDescription(newOpts, 1, t);

  return pathDescription;
};

var getSecondLegDescription = function(options, t) {
  var opts = _.extend({}, legDefaults, options);
  var pathDescription = 'M0,'+((opts.height/2) + opts.deflection) + ' l'+(opts.width/2)+',0' + ' l'+(opts.width/2)+',0';
  return pathDescription;
};

var getThirdLegDescription = function(options, t) {
  var opts = _.extend({}, legDefaults, options);
  var newOpts = _.extend({}, opts, {
    offsetY: opts.offsetY + ((opts.height + opts.deflection) - (opts.strokeWidth / 2))
  });
  var pathDescription = getDeflectedLegDescription(newOpts, -1, t);

  return pathDescription;
};




module.exports = ItemView.extend({
  template: template,

  ui: _.extend({}, ItemView.prototype.ui, {
    toggleButton: '.js-menu-toggle-button',
    toggleIcon: '.js-menu-toggle-icon'
  }),

  events: {
    'mouseenter': 'onItemMouseEnter',
    'mouseleave': 'onItemMouseLeave',
    'click': 'onItemClicked'
  },

  initialize: function(attrs) {
    this.iconOpts = _.extend({}, defaults, (attrs.icon || {}));
    this.iconHover = false;
    this.roomMenuModel = attrs.roomMenuModel;

    // 'change:panelOpenState change:roomMenuIsPinned'
    this.listenTo(this.roomMenuModel, 'change:roomMenuIsPinned', this.onPanelPinChange, this);
  },

  onItemMouseEnter: function() {
    this.iconHover = true;
    this.deflectArms();
  },

  onItemMouseLeave: function() {
    this.iconHover = false;
    this.deflectArms();
  },

  onItemClicked: function() {
    this.trigger('minibar-item:close');
  },

  updatePinnedState: function() {
    var isPinned = !!this.roomMenuModel.get('roomMenuIsPinned');
    //var openState = this.roomMenuModel.get('panelOpenState');

    toggleClass(this.ui.toggleIcon[0], this.iconOpts.pinStateClass, isPinned);
    this.deflectArms();
  },

  onPanelPinChange: function() {
    this.updatePinnedState();
  },

  onDestroy: function() {
    this.stopListening(this.roomMenuModel);
  },

  // Animation/Interaction
  // ------------------------------------------
  getLegDeflectAnimationOptions: function() {
    var opts = this.iconOpts;
    var legElements = this.ui.toggleIcon[0].children;

    return {
      duration: 200,
      queue: false,
      step: function(t, fx) {
        if(legElements) {
          if(fx.prop === 'firstT') {
            legElements[0].setAttribute('d', getFirstLegDescription(opts, fx.now));
          }
          else if(fx.prop === 'thirdT') {
            legElements[2].setAttribute('d', getThirdLegDescription(opts, fx.now));
          }
        }
      }
    };
  },

  deflectArms: function() {
    var isPinned = !!this.roomMenuModel.get('roomMenuIsPinned');
    var isHovered = this.iconHover;

    var legDeflectAnimationOptions = this.getLegDeflectAnimationOptions();
    if(isHovered && isPinned) {
      this.ui.toggleIcon.animate({
        firstT: 0,
        thirdT: 1
      }, legDeflectAnimationOptions);
    }
    else if(isHovered) {
      this.ui.toggleIcon.animate({
        firstT: 1,
        thirdT: 0
      }, legDeflectAnimationOptions);
    }
    else {
      this.ui.toggleIcon.animate({
        firstT: 0,
        thirdT: 0
      }, legDeflectAnimationOptions);
    }
  },


  setupCloseIcon: function() {
    var toggleIconElement = this.ui.toggleIcon[0];

    var totalHeight = this.iconOpts.height + (2 * this.iconOpts.deflection);
    toggleIconElement.setAttribute('width', this.iconOpts.width + 'px');
    toggleIconElement.setAttribute('height', totalHeight + 'px');
    toggleIconElement.setAttribute('viewBox', '0 0 ' + this.iconOpts.width + ' ' + totalHeight);


    var legElements = toggleIconElement.children;
    if(legElements && legElements.length >= 3) {
      legElements[0].setAttribute('d', getFirstLegDescription(this.iconOpts, 0));
      legElements[1].setAttribute('d', getSecondLegDescription(this.iconOpts, 0));
      legElements[2].setAttribute('d', getThirdLegDescription(this.iconOpts, 0));
    }

    this.updatePinnedState();
  },

  onRender: function() {
    this.setupCloseIcon();
  }

});
