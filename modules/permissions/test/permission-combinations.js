'use strict';

var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var userId = mongoUtils.getNewObjectIdString();
var securityDescriptorValidator = require('../lib/security-descriptor-validator');

var TYPES = ['GH_REPO', 'GH_ORG', 'ONE_TO_ONE', 'GH_USER', null];
var MEMBERS = ['PUBLIC', 'INVITE', 'GH_REPO_ACCESS', 'GH_REPO_PUSH', 'GH_ORG_MEMBER', null];
var ADMINS = ['MANUAL', 'GH_REPO_PUSH', 'GH_ORG_MEMBER', 'GH_USER_SAME', null];
var PUBLICS = [true, false, undefined, null];
var LINK_PATHS = ['gitterHQ', 'gitterHQ/test', null];
var EXTERNAL_IDS = ['1', null];
var EXTERNAL_MEMBERS = [null, [], [userId]];
var EXTERNAL_ADMINS = [null, [], [userId]];

function isValid(descriptor) {
  try {
    securityDescriptorValidator(descriptor);
    return true;
  } catch(e) {
    return false;
  }
}
var tests = [];

TYPES.forEach(function(type) {
  MEMBERS.forEach(function(members) {
    ADMINS.forEach(function(admins) {
      PUBLICS.forEach(function(isPublic) {
        LINK_PATHS.forEach(function(linkPath) {
          EXTERNAL_IDS.forEach(function(externalId) {
            EXTERNAL_MEMBERS.forEach(function(externalMembers) {
              EXTERNAL_ADMINS.forEach(function(externalAdmins) {
                var descriptor = {
                  type: type,
                  members: members,
                  admins: admins,
                  public: isPublic,
                  linkPath: linkPath,
                  externalId: externalId,
                  externalMembers: externalMembers,
                  externalAdmins: externalAdmins
                };

                if (isValid(descriptor)) {
                  tests.push(descriptor);
                }
              });
            });
          });
        });
      });
    });
  });
});

module.exports = tests;
