"use strict";

var DEFAULT_TAG_VALUE = require('../../shared/constants/forum-tags').DEFAULT_TAG_VALUE;
var parseTag = require('../../shared/parse/tag');
var _ = require('lodash');

module.exports = function forumTagStore(tags, activeTagName){

  tags = (tags || []);
  activeTagName = (activeTagName || DEFAULT_TAG_VALUE);

  tags = tags.map((tag) => {
    return Object.assign(parseTag(tag), {
      active: (tag === activeTagName),
    });
  });

  tags.unshift({
    value: DEFAULT_TAG_VALUE,
    label: 'All Tags',
    active: (activeTagName === DEFAULT_TAG_VALUE)
  });

  const getTagsByValue = (values) => {
    return values.map((value) => _.find(tags, (t) => t.label === value));
  }

  const pluckValues = () => _.map(tags, 'value').slice(1); //Remove "all-tags"

  return {
    _data: tags,
    data: tags,
    getTags: () => tags,
    getActiveTagName: () => _.find(tags, (tag) => tag.active)[0].value,
    getTagsByValue: getTagsByValue,
    pluckValues: pluckValues
  };
};
