/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var _ = require('underscore');

exports.idsIn = function(ids) {
  return _.uniq(ids).filter(function(id) { return !!id; });
};

exports.keys = function(object) {
    var k = [];
    for (var i in object) if (object.hasOwnProperty(i)) {
      k.push(i);
    }
    return k;
};

exports.extract = function(propertyName) {
    return function(item) {
      return item[propertyName];
    };
};

exports.indexById = function(array) {
  var a = {};
  array.forEach(function(item) {
    a[item.id || item._id] = item;
  });

  return a;
};

exports.indexByProperty = function(array, propertyName) {
  var a = {};
  array.forEach(function(item) {
    a[item[propertyName]] = item;
  });

  return a;
};


exports.hashArray = function(array) {
  var a = {};
  array.forEach(function(item) {
    a[item] = true;
  });

  return a;
};

exports.predicates = {
  notNull: function(v) {
    return (v !== null) && (v !== undefined);
  }
};

