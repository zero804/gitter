"use strict";

var forumCategoryService = require("gitter-web-forum-categories/lib/forum-category-service");
var ForumCategoryStrategy = require('./forum-category-strategy');

var idStrategyGenerator = require('../id-strategy-generator');

var ForumCategoryIdStrategy = idStrategyGenerator('ForumCategoryIdStrategy', ForumCategoryStrategy, forumCategoryService.findByIds);

module.exports = ForumCategoryIdStrategy;
