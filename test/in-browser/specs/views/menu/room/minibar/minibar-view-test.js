"use strict";

var assert = require('assert');
var Backbone = require('backbone');
var MinibarView = require('../../../../../../../public/js/views/menu/room/minibar/minibar-view');

describe('MinibarView', function(){
  var el;
  var model;
  var view;
  beforeEach(function(){
    el = document.createElement('div');
    model = new Backbone.Model();

    model.minibarHomeModel = new Backbone.Model({ type: 'all', name: 'all' });

    view = new MinibarView({
      el: el,
      model: model,
    });
  });

  it('it should set active on the home model when the model changes state to all', function(){
    model.set('state', 'all');
    assert(model.minibarHomeModel.get('active'));
    assert(model.minibarHomeModel.get('focus'));
  });

});
