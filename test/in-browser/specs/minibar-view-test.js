/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert      = require('assert');
var MiniBarView = require('../../../public/js/views/menu/minibar-view');

describe('MinibarView', function(){

  var miniBar;
  var el;

  beforeEach(function(){
    el = document.createElement('div');
    miniBar = new MiniBarView({ el: el });
  });

  it('should emit an event when its element is clicked', function(done){

    miniBar.on('minibar:clicked', function(){
      assert.ok(true);
      done();
    });

    el.click();

  });

});
