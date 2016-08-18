"use strict";

var constants = require('../../../shared/constants/create-topic');

module.exports = function titleUpdate(title){
  return {
    type: constants.TITLE_UPDATE,
    title: title
  };
};
