'use strict';

var _                         = require('underscore');
var PrimaryCollectionItemView = require('../primary-collection/primary-collection-item-view');
var BaseCollectionItemView    = require('../base-collection/base-collection-item-view');
var fastdom                   = require('fastdom');
var toggleClass               = require('utils/toggle-class');

module.exports = PrimaryCollectionItemView.extend({

  modelEvents: _.extend({}, PrimaryCollectionItemView.prototype.modelEvents, {
    'change:isTempItem': 'onChangeTemp'
  }),

  attributes: function() {
    var className = (this.model.get('githubType') === 'ONETOONE') ? 'room-item--favourite-one2one' : 'room-item--favourite';
    //If the item was not previously in the favourite collection before drag start it could have
    //just been added by a user dragging, as such we want to mark it as a temporary item JP 1/4/16
    debugger

    if(this.model.get('isTempItem')){
      className = className += ' temp';
    }

    return _.extend({}, PrimaryCollectionItemView.prototype.attributes.apply(this, arguments), {
      class: className
    });
  },

  onChangeTemp: function (model, val){ //jshint unused: true
    toggleClass(this.el, 'temp-active', val);
  },

  onRender: function (){
    BaseCollectionItemView.prototype.onRender.apply(this, arguments);
    //when temp items are rendered we want to wait and then
    //animate them in JP 4/4/16
    this.el.classList.remove('room-item');
    this.el.classList.remove('room-item--one2one');
    if (this.model.get('oneToOne')) {
      this.el.classList.add('room-item--favourite-one2one');
    }
    else {
      this.el.classList.add('room-item--favourite');
    }

    if(this.model.get('isTempItem')) {
      setTimeout(function(){
        fastdom.mutate(function(){
          this.el.classList.add('temp-active');
        }.bind(this));
      }.bind(this), 32);
    }
    else {
      this.el.classList.remove('temp');
      this.el.classList.remove('temp-active');
    }
  },
});
