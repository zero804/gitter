"use strict";

var slugify = require('slug');
var Promise = require('bluebird');
var ForumCategory = require('gitter-web-persistence').ForumCategory;
var fixtureUtils = require('./fixture-utils');
var debug = require('debug')('gitter:tests:test-fixtures');



function createCategory(fixtureName, f) {
  debug('Creating %s', fixtureName);

  var name = f.name || fixtureUtils.generateName();
  var doc = {
    name: name,
    slug: f.slug || slugify(name),
    forumId: f.forum && f.forum._id
  };

  debug('Creating forum category %s with %j', fixtureName, doc);

  return ForumCategory.create(doc);
}

function createExtraCategories(expected, fixture, key) {
  var obj = expected[key];
  var category = obj.category;
  if (!category) return;

  if (typeof category !== 'string') throw new Error('Please specify the category as a string id');

  if (fixture[category]) {
    // Already specified at the top level
    obj.category = fixture[category];
    return;
  }

  debug('creating extra forum category %s', category);

  return createCategory(category, {})
    .then(function(createdCategory) {
      obj.category = createdCategory;
      fixture[category] = createdCategory;
    });
}

function createCategories(expected, fixture) {
  return Promise.map(Object.keys(expected), function(key) {
    if (key.match(/^category/)) {
      var expectedCategory = expected[key];

      return createCategory(key, expectedCategory, fixture)
        .then(function(category) {
          fixture[key] = category;
        });
    }

    return null;
  })
  .then(function() {
    return Promise.map(Object.keys(expected), function(key) {
      if (key.match(/^topic/)) {
        return createExtraCategories(expected, fixture, key);
      }

      return null;
    });
  });
}

module.exports = createCategories;
