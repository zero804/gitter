"use strict";

import { NAVIGATE_TO_TOPIC } from '../../constants/navigation.js';

module.exports = function navigateToTopic(groupName, id, slug){
  return {
    type: NAVIGATE_TO_TOPIC,
    groupName,
    id: id,
    slug: slug
  };
};
