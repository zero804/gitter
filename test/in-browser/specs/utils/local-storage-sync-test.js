/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert = require('assert');
var Backbone = require('backbone');
var localStorageSync = require('public/js/utils/local-storage-sync');

describe('LocalStorageSync', function() {

  var model;

  beforeEach(function() {
    var Model = Backbone.Model.extend({ sync: localStorageSync.sync });
    model = new Model();
  });

  it('should persist values into local storage when saved', function() {
    model.set({ test: 1 });
    model.save();
    var savedData = JSON.parse(localStorage[model.cid]);
    assert.equal(savedData.test, model.get('test'));
  });

  it('should retrieve data from local storage when fetch is called', function(){
    localStorage[model.cid] = '{ "test": 1 }';
    model.fetch();
    assert.equal(1, model.get('test'));
  });

});
