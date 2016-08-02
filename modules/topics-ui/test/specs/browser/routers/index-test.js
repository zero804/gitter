"use strict";

var assert = require('assert');
var Backbone = require('backbone');
var router = require('../../../../browser/js/routers/index');

describe('Router', function(){

  var trigger = {trigger: true};

  beforeEach(function(){
    window.location.hash = 'gitterHQ/topics';
    Backbone.history.start({
      pushState: false,
    });
  });

  afterEach(function(){
    window.location.hash = '';
    Backbone.history.stop();
  });

  it('should start with the right default route', function(){
    assert.equal(router.get('route'), 'forum');
  });

  it('should have the right inital groupName', function(){
    assert.equal(router.get('groupName'), 'gitterHQ');
  });

  it('should have the right inital filter', function(){
    assert.equal(router.get('filter'), 'all');
  });

  it.only('should have the right filter on url change', function(){
    assert.equal(router.get('filter'), 'all');
    Backbone.history.navigate('gitterHQ/topics?filter=activity', trigger);
    assert.equal(router.get('filter'), 'activity');
  });

});
