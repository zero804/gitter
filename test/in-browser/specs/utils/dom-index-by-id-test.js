/*global describe:true, it:true, beforeEach:true, afterEach:true */
'use strict';

var assert         = require('assert');
var domIndexerById = require('public/js/utils/dom-index-by-id');

describe.only('DomIndexerById', function(){

  var el;
  var el1;
  var el2;

  beforeEach(function(){
    el     = document.createElement('div');
    el1    = document.createElement('div');
    el2    = document.createElement('div');
    el1.id = 'test1';
    el2.id = 'test2';
    el.appendChild(el1);
    el.appendChild(el2);
  });

  it('should index dom elements by id', function(){
    var expected = {
      'test1': el1,
      'test2': el2
    };
    var result = domIndexerById(el);
    assert.deepEqual(expected, result);
  });

});
