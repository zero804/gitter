"use strict";

var assert = require('assert');
var sinon = require('sinon');
var Backbone = require('backbone');
var dispatcher = require('gitter-web-topics-ui/shared/dispatcher');

var events = Backbone.Events;

describe('Dispatcher', function(){

  var handle;
  beforeEach(function(){
    handle = sinon.spy();
  });

  it('should provide a subscribe function', function(){
    assert(dispatcher.subscribe);
  });

  it('should provide a unsubscribe function', () => {
    assert(dispatcher.unsubscribe);
  });

  it('should provide a dispatch function', () => {
    assert(dispatcher.dispatch);
  });

  it('should allow you to subscribe to events', () => {
    dispatcher.subscribe('an-event', handle);
    events.trigger('an-event');
    assert.equal(handle.callCount, 1);
  });

  it('should allow you to unsubscribe to events', () => {
    dispatcher.subscribe('an-event', handle);
    dispatcher.unsubscribe('an-event', handle);
    events.trigger('an-event');
    assert.equal(handle.callCount, 0);
  });

  it('should allow you to dispatch events', () => {
    dispatcher.subscribe('an-event', handle);
    dispatcher.dispatch({ type: 'an-event' });
    assert.equal(handle.callCount, 1);
  });

  it('should pass the right payload during a dispatch', () => {
    dispatcher.subscribe('an-event', handle);
    dispatcher.dispatch({
      type: 'an-event',
      data: 'THIS IS THE NEWS'
    });
    assert(handle.calledWithMatch({data: 'THIS IS THE NEWS'}));
    //
  });

});
