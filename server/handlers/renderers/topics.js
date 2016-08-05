"use strict";

var StatusError = require('statuserror');
var fonts = require('../../web/fonts');
var forumService = require('gitter-web-forums').forumService;
var forumCategoryStore = require('gitter-web-topics-ui/server/stores/forum-category-store');
var forumTagStore = require('gitter-web-topics-ui/server/stores/forum-tag-store');
var navConstants = require('gitter-web-topics-ui/browser/js/constants/navigation');

function renderForum(req, res, next) {

  if (!req.fflip || !req.fflip.has('topics')) {
    return next(new StatusError(404));
  }

  forumService.findByName(req.params.roomPart1)
    .then(function(forum){

      var categoryName = (req.params.categoryName || navConstants.DEFAULT_CATEGORY_NAME);
      var filterName = (req.query.filter || navConstants.DEFAULT_FILTER_NAME);
      var tagName = (req.query.tag || navConstants.DEFAULT_TAG_NAME);
      var sortName = (req.query.sort || navConstants.DEFAULT_SORT_NAME);

      res.render('topics/forum', {
        layout: 'topics-layout',
        hasCachedFonts: fonts.hasCachedFonts(req.cookies),
        fonts: fonts.getFonts(),
        componentData: {
          forum: forum,

          groupName: req.params.roomPart1,
          categoryName: categoryName,
          filterName: filterName,
          tagName: tagName,
          sortName: sortName,

          categoryStore: forumCategoryStore(forum.categories, categoryName),
          tagStore: forumTagStore(forum.tags, tagName),
        }
      });
    });
}

module.exports = {
  renderForum: renderForum,
};
