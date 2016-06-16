'use strict';

var Marionette = require('backbone.marionette');
var cocktail = require('cocktail');
var KeyboardEventMixin = require('views/keyboard-events-mixin');

var KeyboardController = Marionette.ItemView.extend({

  keyboardEvents: {
    'room.1': 'onMinibarItemSelected'
  },

  onMinibarItemSelected: function (){
  },

});

cocktail.mixin(KeyboardController, KeyboardEventMixin);
module.exports = KeyboardController;
