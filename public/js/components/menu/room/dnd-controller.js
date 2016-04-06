'use strict';

var Backbone = require('backbone');
var dragula  = require('dragula');
var _        = require('underscore');

var DNDCtrl = function(attrs){

  if(!attrs || !attrs.model) {
    throw new Error('A valid model must be passed to a new instance of the DNDController');
  }
  this.model = attrs.model;
  this.onMouseUp = this.onMouseUp.bind(this);

  this.drag = dragula([], {
    moves:           this.shouldItemMove.bind(this),
  });

  this.drag.on('dragend', this.onDragEnd.bind(this));
  this.drag.on('cancel',  this.onDragEnd.bind(this));
  this.drag.on('remove',  this.onDragEnd.bind(this));
  this.drag.on('drag',    this.onDragStart.bind(this));
  this.drag.on('drop',    this.onItemDropped.bind(this));

};

DNDCtrl.prototype = _.extend(DNDCtrl.prototype, Backbone.Events, {

  shouldItemMove: function (el){
    return (el.tagName  !== 'A' &&
            !el.classList.contains('search-message-empty-container') &&
            el.id !== 'empty-view');
  },

  pushContainer: function (el){
    this.drag.containers.push(el);
  },

  //TODO TEST THIS
  removeContainer: function (el){
    var index = this.drag.containers.indexOf(el);
    if(index === -1 ){ return }
    this.drag.containers.splice(index, 1);
  },

  onItemDropped: function(el, target, source, sibling){//jshint unused: true
    //guard against no drop target
    if(!target || !target.dataset) { return }

    if (this.model.get('state') !== 'favourite' &&
        target.dataset.stateChange === 'favourite') {
      this.trigger('room-menu:add-favourite', el.dataset.id);
      this.onDragEnd();
    }
    else if(target.classList.contains('collection-list--primary')) {
      this.trigger('room-menu:remove-favourite', el.dataset.id);
      this.onDragEnd();
    }
    else {
      var siblingID = !!sibling && sibling.dataset.id;
      this.trigger('room-menu:sort-favourite', el.dataset.id, siblingID);
      this.onDragEnd();
    }

  },

  onDragStart: function (){
    this.trigger('dnd:start-drag');
    window.addEventListener('mouseup', this.onMouseUp);
  },

  onDragEnd: function (){
    window.removeEventListener('mouseup', this.onMouseUp);
    this.trigger('dnd:end-drag');
  },

  onMouseUp: function (){
    window.removeEventListener('mouseup', this.onMouseUp);
    this.onDragEnd();
  },

});

module.exports = DNDCtrl;
