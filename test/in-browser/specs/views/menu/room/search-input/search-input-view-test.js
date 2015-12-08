/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert          = require('assert');
var Backbone        = require('backbone');
var SearchInputView = require('public/js/views/menu/room/search-input/search-input-view');

describe('SearchInputView', function() {

  var model;
  var el;
  var searchInputView;

  beforeEach(function() {
    el = document.createElement('div');

    model = new Backbone.Model({
      state: 'all'
    });

    searchInputView = new SearchInputView({
      el: el,
      model: model,
    });

    searchInputView.render();
  });

  it('should render an input into it\'s element', function() {
    assert.ok(!!searchInputView.$el.find('input').length);
  });

  it('should add an active class to it\'s el when it\'s model is in the search state', function(done){
    assert.ok(!el.classList.contains('active'));
    model.set('state', 'search');
    setTimeout(function(){
      assert.ok(el.classList.contains('active'));
      model.set('state', 'all');
      setTimeout(function(){
        assert.ok(!el.classList.contains('active'));
        done();
      }, 50);
    }, 50);
  });

});
