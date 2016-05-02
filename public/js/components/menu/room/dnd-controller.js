'use strict';

var Backbone = require('backbone');
var dragula  = require('dragula');
var _        = require('underscore');

var distance = function(pt1, pt2) {
  var dist2 = Math.pow(pt1.x - pt2.x, 2) + Math.pow(pt1.y - pt2.y, 2);
  var dist = Math.sqrt(dist2);
  return dist;
};


var DNDCtrl = function(attrs) {
  attrs = attrs || {};

  if (!attrs.model) {
    throw new Error('A valid model must be passed to a new instance of the DNDController');
  }

  this.deadzone = attrs.deadzone || 20;
  this.model = attrs.model;

  this.currentDragDistance = 0;
  this.prevMousePosition = null;

  this.onMouseUp = this.onMouseUp.bind(this);
  this.onMouseMove = this.onMouseMove.bind(this);

  this.drag = dragula([], {
    moves:   this.shouldItemMove.bind(this),
  });

  this.drag.on('drag',    this.onDragStart.bind(this));
  this.drag.on('dragend', this.onDragEnd.bind(this));
  this.drag.on('remove',  this.onDragEnd.bind(this));
  this.drag.on('drop',    this.onItemDropped.bind(this));
  this.drag.on('cancel',  this.onDragCancel.bind(this));
  this.drag.on('over',    this.onContainerHover.bind(this));

  // Can't space separate multiple events with dragulas `contra/emitter` :(
  this.drag.on('drop',   this.onDragDoneDeadzoneActivate.bind(this));
  this.drag.on('cancel', this.onDragDoneDeadzoneActivate.bind(this));
};

DNDCtrl.prototype = _.extend(DNDCtrl.prototype, Backbone.Events, {

  shouldItemMove: function (el) {
    return (el.tagName  !== 'A' &&
            !el.classList.contains('search-message-empty-container') &&
            el.id !== 'empty-view');
  },

  pushContainer: function (el) {
    this.drag.containers.push(el);
  },

  //TODO TEST THIS
  removeContainer: function (el) {
    var index = this.drag.containers.indexOf(el);
    if (index === -1) { return; }

    this.drag.containers.splice(index, 1);
  },

  onItemDropped: function(el, target, source, sibling) {//jshint unused: true
    var didActivate = this.onDragDoneDeadzoneActivate(el, target);

    if(!didActivate) {
      //guard against no drop target
      if(!target || !target.dataset) { return }

      if (this.model.get('state') !== 'favourite' &&
          target.dataset.stateChange === 'favourite') {
        this.trigger('room-menu:add-favourite', el.dataset.id);
        this.onDragEnd();
      } else if (target.classList.contains('collection-list--primary')) {
        this.trigger('room-menu:remove-favourite', el.dataset.id);
        this.onDragEnd();
      } else {
        var siblingID = !!sibling && sibling.dataset.id;
        this.trigger('room-menu:sort-favourite', el.dataset.id, siblingID);
        this.onDragEnd();
      }
    }
  },

  onDragCancel: function(el) {
    this.onDragDoneDeadzoneActivate(el);
  },

  onDragDoneDeadzoneActivate: function(el, target) {
    // When `target` isn't definend, the element was dropped where it came from
    // So we will just consider it as a "click"/activation
    if(!target && this.currentDragDistance <= this.deadzone) {
      this.trigger('dnd:activate-item', el.dataset.id);
      return true;
    }
  },

  onDragStart: function () {
    this.currentDragDistance = 0;
    this.prevMousePosition = null;

    this.mirror = document.querySelector('gu-mirror');
    window.addEventListener('mouseup', this.onMouseUp);
    // We could get slightly more accurate results if we always listened to mouse move
    // Or had a click handler to start off the initial mouse position for this drag.
    // But this is a simple way to avoid event-listener clean-up
    window.addEventListener('mousemove', this.onMouseMove);

    this.trigger('dnd:start-drag');
  },

  onDragEnd: function (el) {
    this.mirror = null;
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    if(el) {
      el.classList.remove('hidden');
      el.classList.remove('will-hideaway');
    }

    this.trigger('dnd:end-drag');
  },

  onMouseUp: function () {
    this.onDragEnd();
  },

  onMouseMove: function(e) {
    var currentPosition = {
      x: e.clientX,
      y: e.clientY
    };

    this.currentDragDistance += distance(this.prevMousePosition || currentPosition, currentPosition);

    this.prevMousePosition = currentPosition;
  },

  onContainerHover: function (el, container) { //jshint unused: true
    var mirror;
    var transit;

    //If we hover over the favourite collection hide the drag mirror
    if (container.classList.contains('collection-list--favourite')) {
      mirror  = document.querySelector('.gu-mirror');
      transit = document.querySelector('.gu-transit');
      if (mirror) { mirror.classList.add('hidden'); }
      if(transit) { transit.classList.remove('will-hideaway'); }
    }

    //If we hover over the primary collection show the drag mirror
    else if (container.classList.contains('collection-list--primary')) {
      mirror  = document.querySelector('.gu-mirror');
      transit = document.querySelector('.gu-transit');
      if (mirror) { mirror.classList.remove('hidden'); }
      if(transit) { transit.classList.add('will-hideaway'); }
    }
  },

});

module.exports = DNDCtrl;
