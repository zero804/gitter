"use strict";

var assert = require('assert');
var Backbone = require('backbone');
var Router = require('../../../../browser/js/routers/index');

describe('Router', function(){

  var router;
  beforeEach(function(){
    router = new Router();
    Backbone.History.start({
      root: '/test/fixtures/',
      pushState: false,
    });
  });

  afterEach(function(){
    Backbone.History.stop();
  });

  it('should start with the right default route', function(){

  });

});
