"use strict";

var Router = require('../../browser/js/routers');
var navConstants = require('../../shared/constants/navigation');

var MockRouter = Router.extend({
  defaults: {
    route: 'forum',
    createTopic: false,
    groupName: 'gitterHQ',
    categoryName: navConstants.DEFAULT_CATEGORY_NAME,
    filterName:  navConstants.DEFAULT_FILTER_NAME,
    tagName: navConstants.DEFAULT_TAG_NAME,
    sortName:  navConstants.DEFAULT_SORT_NAME,
    topicId: 1234567890,
    slug: 'this-is-a-slug'
  }
});

module.exports = new MockRouter();
