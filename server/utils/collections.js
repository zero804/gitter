/*jslint node: true */
"use strict";

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
    a[item._id] = item;
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

