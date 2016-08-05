"use strict";

module.exports = function forumTagStore(tags = [], activeTagName = 'all-tags'){

  tags = tags.map((tag) => ({
    value: tag,
    name: tag,
    active: (tag === activeTagName),
  }));

  tags.unshift({ value: 'all-tags', name: 'All Tags', active: (activeTagName === 'all-tags') });

  const getTags = () => tags;

  return {
    models: tags,
    getTags: getTags,
  };
};
