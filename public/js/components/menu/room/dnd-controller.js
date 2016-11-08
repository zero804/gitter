'use strict';

var Backbone = require('backbone');
var dragula = require('dragula');
var _ = require('underscore');

var DNDCtrl = function() {

  this.onMouseUp = this.onMouseUp.bind(this);
  this.panelRef = document.querySelector('.room-menu__panel');

  this.drag = dragula([], {
    moves: this.shouldItemMove.bind(this),
    deadzone: 10
  });

  this.drag.on('drag', this.onDragStart.bind(this));
  this.drag.on('dragend', this.onDragEnd.bind(this));
  this.drag.on('remove', this.onDragEnd.bind(this));
  this.drag.on('drop', this.onItemDropped.bind(this));
  this.drag.on('over', this.onContainerHover.bind(this));
};

DNDCtrl.prototype = _.extend(DNDCtrl.prototype, Backbone.Events, {

  shouldItemMove: function (el) {
    //Stop dnd behaviour in group view
    if(this.panelRef.classList.contains('group')) { return false; }

    return (el.tagName !== 'A' &&
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
    //guard against no drop target
    if(!target || !target.dataset) { return }

    var id = el.dataset.id;
    var type = el.dataset.type;
    var siblingID = !!sibling && sibling.dataset.id;

    if (type === 'room' && target.classList.contains('collection-list--primary')) {
      this.trigger('room-menu:remove-favourite', id);
    }
    else if (type === 'room' && target.classList.contains('collection-list--favourite')) {
      this.trigger('room-menu:sort-favourite', id, siblingID);
    }
    else if (target.classList.contains('minibar-collection-list')) {
      this.trigger('minibar:update-favourite-group', id, type, siblingID);
      if(type === 'room') {
        this.drag.cancel(true);
      }
    }
    else if (type === 'minibar-group' && !target.classList.contains('minibar-collection-list')) {
      this.trigger('minibar:remove-favourite-group', id);
    }

    this.onDragEnd();
  },

  onDragStart: function () {
    this.mirror = document.querySelector('gu-mirror');
    this.trigger('dnd:start-drag');
    window.addEventListener('mouseup', this.onMouseUp);
  },

  onDragEnd: function (el) {
    this.mirror = null;
    window.removeEventListener('mouseup', this.onMouseUp);
    if(el) {
      el.classList.remove('hidden');
      el.classList.remove('will-hideaway');
    }

    this.trigger('dnd:end-drag');
  },

  onMouseUp: function () {
    this.onDragEnd();
  },

  onContainerHover: function (el, container) { //jshint unused: true
    var mirror;
    var transit;

    //If we hover over the favourite collection hide the drag mirror
    if (container.classList.contains('collection-list--favourite')) {
      mirror = document.querySelector('.gu-mirror');
      transit = document.querySelector('.gu-transit');
      if (mirror) { mirror.classList.add('hidden'); }
      if(transit) { transit.classList.remove('will-hideaway'); }
    }

    //If we hover over the primary collection show the drag mirror
    else if (container.classList.contains('collection-list--primary')) {
      mirror = document.querySelector('.gu-mirror');
      transit = document.querySelector('.gu-transit');
      if (mirror) { mirror.classList.remove('hidden'); }
      if(transit) { transit.classList.add('will-hideaway'); }
    }
  },

});

module.exports = DNDCtrl;
