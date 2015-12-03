/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert          = require('assert');
var Backbone        = require('backbone');
var ProfileMenuView = require('public/js/views/menu/room/profile/profile-menu-view');

describe('ProfileMenuView', function(){
  var model;
  var el;
  var profileMenuView;

  beforeEach(function(){
    model = new Backbone.Model({ state: 'all', profileMenuOpenState: false });
    el = document.createElement('div');
    profileMenuView = new ProfileMenuView({ el: el, model: model });
  });

  it('should toggle its elements class when the profileMenuOpenState changes', function(){
    assert.ok(!model.get('profileMenuOpenState'));
    assert.ok(!el.classList.contains('active'));

    model.set('profileMenuOpenState', true);
    assert.ok(model.get('profileMenuOpenState'));
    assert.ok(el.classList.contains('active'));

    model.set('profileMenuOpenState', false);
    assert.ok(!model.get('profileMenuOpenState'));
    assert.ok(!el.classList.contains('active'));
  });

  it('should toggle its elements class when the profileMenuOpenState changes only when the models state is "all"', function(){

    model.set('state', 'search');
    model.set('profileMenuOpenState', true);
    assert.ok(!el.classList.contains('active'));

    model.set('profileMenuOpenState', false);
    assert.ok(!el.classList.contains('active'));
  });

});
