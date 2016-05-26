/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert = require('assert');
var Backbone = require('backbone');
var ProfileMenuView = require('public/js/views/menu/room/profile/profile-menu-view');

describe('ProfileMenuView', function() {
  var model;
  var el;

  beforeEach(function() {
    model = new Backbone.Model({ state: 'all', profileMenuOpenState: false });
    el = document.createElement('div');
    new ProfileMenuView({ el: el, model: model });
  });

  //Sadly as we are using request animation frame some checks must be wrapped
  //in timeouts ... yuck jp 8/12/15
  it('should toggle its elements class when the profileMenuOpenState changes', function(done) {
    assert.ok(!model.get('profileMenuOpenState'));
    assert.ok(!el.classList.contains('active'));
    model.set('profileMenuOpenState', true);

    assert.ok(el.classList.contains('active'));
    model.set('profileMenuOpenState', false);
    assert.ok(!el.classList.contains('active'));
    done();

  });

});
