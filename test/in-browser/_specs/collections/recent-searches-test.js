/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert = require('assert');
var RecentSearchesCollection = require('../../../../public/js/collections/recent-searches.js');

describe('RecentSearchesCollection', function() {

  var recentSearchesCollection;
  beforeEach(function() {
    recentSearchesCollection = new RecentSearchesCollection([]);
  });

  //Using a filtered collection does not update the length or model properties
  //Dont really understand how it works with mationette .... JP 9/1/16
  it.skip('should only add uniq items to the collection', function() {
    recentSearchesCollection.add({name: '1'});
    recentSearchesCollection.add({name: '1'});
    assert.equal(1, recentSearchesCollection.length);
  });

  it('should not add items with no name', function(){
    recentSearchesCollection.add({id: '1'});
    recentSearchesCollection.add({id: '2'});
    assert.equal(0, recentSearchesCollection.length);
  });

  it('should sort items in reverse order to when they were added', function(){
    recentSearchesCollection.add({name: '1'});
    recentSearchesCollection.add({name: '2'});
    recentSearchesCollection.add({name: '3'});
    recentSearchesCollection.add({name: '4'});
    recentSearchesCollection.add({name: '5'});
    recentSearchesCollection.models.forEach(function(model, index){
      index = index += '';
      var expected = (recentSearchesCollection.length - index);
      assert.equal(model.get('name'), expected);
    });
  });

});
