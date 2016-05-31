/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert = require('assert');
// var Backbone = require('backbone');
var PanelFooterView = require('public/js/views/menu/room/footer/footer-view');

describe('PanelFooterView', function() {

  // var panelFooterView;
  // var model;

  beforeEach(function() {
    // model = new Backbone.Model({
    //   roomMenuIsPinned: false,
    // });

    // panelFooterView = new PanelFooterView({
    //   bus: Backbone.Events,
    //   model: model,
    // });
  });

  it('should throw an error if it is instantiated with no events bus', function(done) {
    try {
      new PanelFooterView();
    }
    catch (e) {
      assert.equal(e.message, 'A valid event bus must be passed to a new instance of PanelFooterView');
      done();
    }
  });

});
