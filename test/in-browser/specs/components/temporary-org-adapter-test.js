"use strict";

var assert = require('assert');
var Backbone = require('backbone');
var context = require('utils/context');
var tempOrgAdapter  = require('../../../../public/js/components/temporary-org-adapter');


describe('tempOrgAdapter', function(){

  var roomCollection;
  var groupCollection;
  beforeEach(function(){
    roomCollection = new Backbone.Collection([
      { uri: 'troupe/test1', id: 1 },
      { uri: 'gitterHQ/test1', id: 2 },
    ]);
    groupCollection = new Backbone.Collection([
      { name: 'gitterHQ' },
      { name: 'troupe' },
    ]);
    context.troupe().set(roomCollection.at(0));
    tempOrgAdapter(roomCollection, groupCollection);
  });

  describe('init', function(){
    it('should throw an error if not called with a room list', function(done){
      try { tempOrgAdapter(null, []) }
      catch(e) {
        assert.equal(e.message, 'tempOrgAdapter MUST be called with a valid room collection');
        done();
      }
      assert(false, 'Error not thrown');
    });

    it('should throw an error if not called with a group list', function(done){
      try { tempOrgAdapter([]) }
      catch(e) {
        assert.equal(e.message, 'tempOrgAdapter MUST be called with a valid group collection');
        done();
      }
      assert(false, 'Error not thrown');
    });
  });

  it('should add a temporary org when the context.troupe changes', function(){
    context.troupe().set({ id: 3, uri: 'google/gxui' });
    assert.equal(groupCollection.at(2).get('name'), 'google');
  });

  it('should not add a new org if the room is in the room list', function(){
    context.troupe().set(roomCollection.at(0).toJSON());
    assert.equal(groupCollection.length, 2);
  });

  it('should add a temporary org on init', function(){

    var roomCollection1 = new Backbone.Collection([
      { uri: 'troupe/test1', id: 1 },
      { uri: 'gitterHQ/test1', id: 2 },
    ]);
    var groupCollection1 = new Backbone.Collection([
      { name: 'gitterHQ' },
      { name: 'troupe' },
    ]);
    context.troupe().set({ id: 3, uri: 'google/gxui' });
    tempOrgAdapter(roomCollection1, groupCollection1);
    assert.equal(groupCollection1.at(2).get('name'), 'google');
  });

});
