"use strict";

var Lazy = require('lazy.js');
var _ = require('lodash');
var forumCategoryService = require('gitter-web-topics/lib/forum-category-service');
var ForumCategoryStrategy = require('../forum-category-strategy');

function CategoriesForForumStrategy(/*options*/) {
  this.categoriesByForum = null;
  this.categoryStrategy = null;
}

CategoriesForForumStrategy.prototype = {
  preload: function(forumIds) {
    return forumCategoryService.findByForumIds(forumIds.toArray())
      .bind(this)
      .then(function(categories) {
        this.categoriesByForum = _.groupBy(categories, 'forumId');

        var categoryStrategy = this.categoryStrategy = new ForumCategoryStrategy();
        return categoryStrategy.preload(Lazy(categories));
      });
  },

  map: function(forumId) {
    var categories = this.categoriesByForum[forumId];
    if (!categories || !categories.length) return [];

    var categoryStrategy = this.categoryStrategy;
    return _.map(categories, function(category) {
      return categoryStrategy.map(category);
    })
  },

  name: 'CategoriesForForumStrategy'
};


module.exports = CategoriesForForumStrategy;
