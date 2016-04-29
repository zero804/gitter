'use strict';

var getOrgNameFromTroupeName = require('gitter-web-shared/get-org-name-from-troupe-name');
var escapeStringRegexp       = require('escape-string-regexp');

module.exports = function getOrgStateNameFromTroupeName(name) {
  return name.replace(new RegExp('^' + escapeStringRegexp(getOrgNameFromTroupeName(name)) + '/'), '');
};
