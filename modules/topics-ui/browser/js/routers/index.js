"use strict"

var Backbone = require('backbone');

module.exports = Backbone.Router.extend({
  routes: {
    '': 'index'
  },
  index: function(){
    console.log('working');
  }
});
