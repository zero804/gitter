/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert                    = require('assert');
var Backbone                  = require('backbone');
var PrimaryCollectionItemView = require('public/js/views/menu/room/primary-collection/primary-collection-item-view');

/*
 * We cant call render because of hbs helpers ... lame
 * as such ive given up testing this module
 * jp 6/12/16
 */
describe.skip('PrimartCollectionItemView', function() {

  var itemView;
  var el;

  beforeEach(function(){
    el = document.createElement('div');
    itemView = new  PrimaryCollectionItemView({
      index: 1,
      model: new Backbone.Model({
        name: 'gitterHQ'
      }),
      el: el
    });
    itemView.render();
  });

  it('should add an active class to item menu when the options button is clicked', function() {
    //console.log(itemView.el);
  });

});
