"use strict";

/*
 Right now this is a simple shim around Backbone.Events
 This will change with the introduction of mediator-js
 but right now this is the simplest thing
*/

var Backbone = require('backbone');

module.exports = {

  //todo remove
  on: Backbone.Events.on,
  off: Backbone.Events.off,
  trigger: Backbone.Events.trigger,

  subscribe: function(evt, handle, ctx){
    Backbone.Events.on(evt, handle, ctx);
  },

  unsubscribe: function(evt, handle){
    Backbone.Events.off(evt, handle);
  },

  dispatch: function(data){
    var evt = data.type; delete data.type;
    console.log(evt, data);
    Backbone.Events.trigger(evt, data);
  }

};
