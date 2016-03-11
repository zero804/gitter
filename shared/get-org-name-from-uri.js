'use strict';

var getOrgNameFromTroupeName = require('./get-org-name-from-troupe-name.js');

//TODO We should account for more cases than just the org urls
module.exports = function getOrgNameFromUri(uri) {
  //We do have the url /orgs/:orgName/rooms which we have to account for
  if (/^orgs/.test(name)) { return name.split('/')[1]; }
  return getOrgNameFromTroupeName(uri);
};
