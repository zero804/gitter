/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert = require('assert');
var Backbone = require('backbone');
var SearchInputView = require('public/js/views/menu/room/search-input/search-input-view');

describe('SearchInputView', function(){

  var model;
  var el;

  beforeEach(function(){
    el = document.createElement('div');
    model = new Backbone.Model({ state: 'all' });
    new SearchInputView({ el: el, model: model });
  });

  it('should apply an active class only when the model is in a search state', function(){
    assert.ok(!el.classList.contains('active'));
    model.set('state', 'search');
    assert.ok(el.classList.contains('active'));
    model.set('state', 'all');
    assert.ok(!el.classList.contains('active'));
  });

});
