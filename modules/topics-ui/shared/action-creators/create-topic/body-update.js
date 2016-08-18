"use strict";

import { BODY_UPDATE } from '../../constants/create-topic.js';

module.exports = function bodyUpdate(){
  return {
    type: BODY_UPDATE
  };
};
