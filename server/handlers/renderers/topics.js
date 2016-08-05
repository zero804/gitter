"use strict";

var StatusError = require('statuserror');
var fonts = require('../../web/fonts');
var forumService = require('gitter-web-forums').forumService;
var forumCategoryStore = require('gitter-web-topics-ui/server/stores/forum-category-store')
var forumTagStore = require('gitter-web-topics-ui/server/stores/forum-tag-store')

function renderForum(req, res, next) {

  if (!req.fflip || !req.fflip.has('topics')) {
    return next(new StatusError(404));
  }

  forumService.findByName(req.params.roomPart1)
    .then(function(forum){
      res.render('topics/forum', {
        layout: 'topics-layout',
        hasCachedFonts: fonts.hasCachedFonts(req.cookies),
        fonts: fonts.getFonts(),
        componentData: {
          forum: forum,

          groupName: req.params.roomPart1,
          categoryName: req.params.categoryName,
          filterName: req.query.filter,
          tagName: req.query.tag,
          sortName: req.query.sort,

          categoryStore: forumCategoryStore(forum.categories, categoryName),
          tagStore: forumTagStore(forum.tags, tagName),
        }
      });
    });
}

module.exports = {
  renderForum: renderForum,
};
