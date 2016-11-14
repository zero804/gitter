"use strict";

var parseCategoryForTemplate = require('gitter-web-shared/parse/forum-category-item');

/**
 * Snapshots are data that will be sent to the client on page load
 */
function getMainFrameSnapshots(options) {
  var leftMenu = options.leftMenu;
  var rooms = options.rooms;
  var groups = options.groups;
  var leftMenuForumGroupCategories = options.leftMenuForumGroupCategories;
  var leftMenuForumGroup = options.leftMenuForumGroup;

  var forumCategories;

  if (leftMenuForumGroup && leftMenuForumGroupCategories) {
    forumCategories = leftMenuForumGroupCategories.map(function(category) {
      // Crappy mutation here...
      category.groupUri = leftMenuForumGroup.uri;
      return parseCategoryForTemplate(category)
    });
  }

  return {
    leftMenu: leftMenu,
    allRooms: rooms,
    groups: groups,
    forumCategories: forumCategories
  };
}

module.exports = getMainFrameSnapshots;
