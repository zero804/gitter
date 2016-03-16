"use strict";

var persistence = require('./persistence-service');

/**
 * fetchByTags() retrives rooms that match a given set of tags
 *
 * tags     Array the querying tags
 * @return  Promise promise of matching rooms
 */
function fetchByTags(tags) {
  // limit by 8 tags to avoid mega queries
  tags = tags.slice(0, 8);

  return persistence.Troupe
    .where('security').equals('PUBLIC')
    .where('tags').in(tags)
    .sort({ userCount: -1 })
    .limit(50)
    .exec();
}

exports.fetchByTags = fetchByTags;
