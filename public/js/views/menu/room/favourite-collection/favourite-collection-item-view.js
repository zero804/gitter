'use strict';

var _                         = require('underscore');
var PrimaryCollectionItemView = require('../primary-collection/primary-collection-item-view');
var fastdom                   = require('fastdom');

module.exports = PrimaryCollectionItemView.extend({

  attributes: function() {
    //JP 1/4/16
    //If the item was not previously in the favourite collection before drag start it could have
    //just been added by a user dragging, as such we want to mark it as a temporary item
    var className = this.model.get('isTempItem') ? 'room-item--favourite temp' : 'room-item--favourite';
    return _.extend({}, PrimaryCollectionItemView.prototype.attributes.apply(this, arguments), {
      class: className
    });
  },

  onRender: function (){
    //when temp items are rendered we want to wait and then
    //animate them in JP 4/4/16
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
