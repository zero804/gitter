'use strict';

var Backbone = require('backbone');
var dragula  = require('dragula');
var _        = require('underscore');

var DNDCtrl = function(attrs){

  if(!attrs || !attrs.model) {
    throw new Error('A valid model must be passed to a new instance of the DNDController');
  }
  this.model = attrs.model;

  this.drag = dragula([], {
    copy: this.shouldCopyDraggedItem.bind(this),
    move: this.shouldItemMove.bind(this),
  });

};

DNDCtrl.prototype = _.extend(DNDCtrl.prototype, Backbone.Events, {

  shouldCopyDraggedItem: function (){
    return (this.model.get('state') === 'favourite');
  },

  shouldItemMove: function (el){
    return el.tagName  !== 'A';
  },

  pushContainer: function (el){
    this.drag.containers.push(el);
  },

  onItemDropped: function(el, target){//jshint unused: true
    //guard against no drop target
    if(!target || !target.dataset) { return }
    console.log('working', target.dataset.stateChange, this.model.get('state'));

    if (this.model.get('state') !== 'favourite' &&
        target.dataset.stateChange === 'favourite') {
      this.trigger('room-menu:add-favourite', el.dataset.roomId);
    }

  }

});

module.exports = DNDCtrl;
