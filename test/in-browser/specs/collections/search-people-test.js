/*global describe:true, it:true, beforeEach:true, afterEach:true */
'use strict';

var assert                 = require('assert');
var Backbone               = require('backbone');
var SearchPeopleCollection = require('public/js/collections/search-people');

describe('SearchPeopleCollection', function() {

  var collection;
  var model;
  beforeEach(function(){
    model = new Backbone.Model({ searchTerm: 'test' });
    collection = new SearchPeopleCollection(null, { contextModel: model });
  });

  it('should create a url model when initialized with a model', function() {
    assert.ok(collection.urlModel);
  });

  it('should change its url when the model changes', function() {
    assert.equal('/v1/user', collection.url());
    model.set('searchTerm', 'thisisatest');
    assert.equal('/v1/user', collection.url());
  });

  it('should throw an error if fetch is called with no query', function(){
    try { collection.fetch(); }
    catch(e) {
      assert.equal(e.message, 'Search People fetch() called with no { data: { q: "huh?" }}');
    }
  });

});
