"use strict";

var forumCategoryService = require("gitter-web-topics/lib/forum-category-service");
var ForumCategoryStrategy = require('./forum-category-strategy');

var idStrategyGenerator = require('gitter-web-serialization/lib/id-strategy-generator');

var ForumCategoryIdStrategy = idStrategyGenerator('ForumCategoryIdStrategy', ForumCategoryStrategy, forumCategoryService.findByIds);

module.exports = ForumCategoryIdStrategy;
