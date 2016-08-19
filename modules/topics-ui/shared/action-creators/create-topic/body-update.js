"use strict";

import { BODY_UPDATE } from '../../constants/create-topic.js';

module.exports = function bodyUpdate(body){
  return {
    type: BODY_UPDATE,
    body: body
  };
};
