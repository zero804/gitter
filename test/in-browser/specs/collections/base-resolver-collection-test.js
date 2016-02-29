/*global describe:true, it:true, beforeEach:true, afterEach:true */
'use strict';

var assert                 = require('assert');
var Backbone               = require('backbone');
var BaseResolverCollection = require('public/js/collections/base-resolver-collection');

describe('BaseResolverCollection', function() {

  var collection;
  var model;
  beforeEach(function(){
    model = new Backbone.Model({ val: 'test' });
    collection = new BaseResolverCollection(null, { contextModel: model, template: '/this/is/a/:val/template' });
  });

  it('should throw an error if no ContextModel is passed', function() {
    try { new BaseResolverCollection(); }
    catch (e) {
      assert.equal(e.message, 'A valid context model must be passed to a new instance of BaseResolverCollection');
    }
  });

  it('should create a url model when initialized with a model', function() {
    assert.ok(collection.urlModel);
  });

  it('should change its url when the model changes', function() {
    assert.equal('/this/is/a/test/template', collection.url());
    model.set('val', 'thisisatest');
    assert.equal('/this/is/a/thisisatest/template', collection.url());
  });


});
