
var assert = require('assert');
var Backbone = require('backbone');
var router = require('../../../../browser/js/routers/index');
var {dispatch} = require('../../../../shared/dispatcher/');
var navConstants = require('../../../../shared/constants/navigation');

describe.skip('Router', function(){

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

  it('should have the right inital categoryName', function(){
    assert.equal(router.get('categoryName'), 'all');
  });

  it('should have the right filter on url change', function(){
    assert.equal(router.get('categoryName'), 'all');
    Backbone.history.navigate('gitterHQ/topics/categories/activity', trigger);
    assert.equal(router.get('categoryName'), 'activity');
  });

  it('should set the right state after dispatching a forum navigate action', function(){
    dispatch({type: navConstants.NAVIGATE_TO, route: 'forum', category: 'test'});
    assert.equal(router.get('categoryName'), 'test');
    assert.equal(router.get('route'), 'forum');
  });

});
