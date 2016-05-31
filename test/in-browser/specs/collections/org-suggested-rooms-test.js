/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert = require('assert');
var sinon = require('sinon');
var Backbone = require('backbone');
var SuggestedOrgCollection = require('public/js/collections/org-suggested-rooms');

describe('SuggestedOrgCollection()', function() {

  var model;
  var suggestedOrgCollection;

  beforeEach(function() {
    model = new Backbone.Model({ selectedOrgName: 'test', id: 1});
    suggestedOrgCollection = new SuggestedOrgCollection({ contextModel: model });
    suggestedOrgCollection.fetch = sinon.spy();
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
