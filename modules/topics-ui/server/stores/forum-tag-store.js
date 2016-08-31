"use strict";

var DEFAULT_TAG_VALUE = require('../../shared/constants/forum-tags').DEFAULT_TAG_VALUE;

module.exports = function forumTagStore(tags, activeTagName){

  tags = (tags || []);
  activeTagName = (activeTagName || DEFAULT_TAG_VALUE);

  tags = tags.map((tag) => ({
    value: tag,
    name: tag,
    active: (tag === activeTagName)
  }));

  tags.unshift({
    value: DEFAULT_TAG_VALUE,
    name: 'All Tags',
    active: (activeTagName === DEFAULT_TAG_VALUE)
  });

  const getTags = () => tags;

  return {
    models: tags,
    getTags: getTags
  };
};
