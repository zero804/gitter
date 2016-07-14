'use strict';

var isHiddenFilter = function(model) {
  return !model.get('allHidden');
};

module.exports = isHiddenFilter;
