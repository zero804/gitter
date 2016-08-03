"use strict";

module.exports = function forumTagStore(tags = [], activeTagName = ''){

  tags = tags.map((tag) => ({
    tag: tag,
    active: (tag === activeTagName),
  }));

  return {
    models: tags
  };
};
