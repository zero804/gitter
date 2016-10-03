'use strict';

var BaseResolverCollection = require('./base-resolver-collection');

var ForumCategoryCollection = BaseResolverCollection.extend({
  template: '/v1/forums/:forumId/categories'
});

module.exports = ForumCategoryCollection;
