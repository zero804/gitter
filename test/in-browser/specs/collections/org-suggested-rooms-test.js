/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert                 = require('assert');
var sinon                  = require('sinon');
var Backbone               = require('backbone');
var SuggestedOrgCollection = require('public/js/collections/org-suggested-rooms');

describe('SuggestedOrgCollection()', function() {

  var model;
  var suggestedOrgCollection;

  beforeEach(function() {
    model                        = new Backbone.Model({ selectedOrgName: 'test', id: 1});
    suggestedOrgCollection       = new SuggestedOrgCollection([], { contextModel: model });
    suggestedOrgCollection.fetch = sinon.spy();
  });

  it('Should throw an error if no model is passed on init', function(done) {
    try { new SuggestedOrgCollection(); }
    catch (e) {
      assert.equal(e.message, 'A valid model must be passed to SuggestedOrgCollection when initialized');
      done();
    }
  });

  it('should create a url model when initialized with a model', function() {
    assert.ok(suggestedOrgCollection.urlModel);
  });

  it('should change its url when the model changes', function() {
    assert.equal('/v1/orgs/test/suggestedRooms', suggestedOrgCollection.url());
    model.set('selectedOrgName', 'thisisatest');
    assert.equal('/v1/orgs/thisisatest/suggestedRooms', suggestedOrgCollection.url());
  });

  it('should fetch when the models selectedOrgName is changed', function() {
    model.set('selectedOrgName', 'thisisatest');
    assert.equal(1, suggestedOrgCollection.fetch.callCount);
  });

  it('should not fetch when the selectedOrgName is an empty string', function(){
    model.set('selectedOrgName', '');
    assert.equal(0, suggestedOrgCollection.fetch.callCount);
  });

  it('should not fetch if the selectedOrgname is null or undefined', function(){
    model.set('selectedOrgName', null);
    model.set('selectedOrgName', undefined);
    assert.equal(0, suggestedOrgCollection.fetch.callCount);
  });

});
