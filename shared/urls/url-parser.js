'use strict';

var targetEnv = require('targetenv');

if (targetEnv.isBrowser) {
  var urlParser = require('../../public/js/utils/url-parser');
  module.exports = {
    // TODO: rather just add the parameters to urlParser.parse, then just
    // export that entire module
    parse: function parseURL(url, parseQueryString, slashesDenoteHost) {
      var parsed = urlParser.parse(url);
      if (parseQueryString) {
        parsed.query = urlParser.parseSearch(parsed.search);
      }
      return parsed;
    },
    format: urlParser.format
  };
} else {
  module.exports = require('url');
}
