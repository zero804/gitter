/*
 Right now this is a simple shim around Backbone.Events
 This will change with the introduction of mediator-js
 but right now this is the simplest thing
*/

// THIS HAS CODE SMELL

import Backbone from 'backbone';

  //todo remove
export const on = Backbone.Events.on;
export const off = Backbone.Events.off;
export const trigger = Backbone.Events.trigger;

export function subscribe(evt, handle, ctx){
  Backbone.Events.on(evt, handle, ctx);
}

export function unsubscribe(evt, handle){
  Backbone.Events.off(evt, handle);
}

export function dispatch(data){
  var evt = data.type; delete data.type;
  Backbone.Events.trigger(evt, data);
}
