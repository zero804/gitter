'use strict';

require('template/helpers/all');

var requireAll = function(requireContext) {
  return requireContext.keys().map(requireContext);
};

requireAll(require.context('../specs', true, /^\.\/.*-test\.js$/));
