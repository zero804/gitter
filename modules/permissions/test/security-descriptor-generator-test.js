'use strict';

var assert = require('assert');
var ObjectID = require('mongodb').ObjectID;
var securityDescriptorGenerator = require('../lib/security-descriptor-generator');

describe('security-descriptor-generator', function() {
  var USERID = ObjectID(1);
  var GROUPID = ObjectID(2);

  var FIXTURES = [{
    name: 'type=null',
    options: {
      type: null
    },
    expected: {
      type: null,
      members: 'PUBLIC',
      admins: 'MANUAL',
      extraAdmins: [USERID],
      extraMembers: [],
      public: true
    }
  },{
    name: 'type=null, security=PRIVATE',
    options: {
      type: null,
      security: 'PRIVATE'
    },
    expected: {
      type: null,
      members: 'INVITE',
      admins: 'MANUAL',
      extraAdmins: [USERID],
      extraMembers: [],
      public: false
    }
  },{
    name: 'type=GH_ORG, security=PUBLIC',
    options: {
      type: 'GH_ORG',
      security: 'PUBLIC',
      linkPath: 'x/y'
    },
    expected: {
      type: 'GH_ORG',
      externalId: undefined,
      members: 'PUBLIC',
      admins: 'GH_ORG_MEMBER',
      public: true,
      linkPath: 'x/y'
    }
  },{
    name: 'type=GH_ORG, security=PRIVATE',
    options: {
      type: 'GH_ORG',
      security: 'PRIVATE',
      linkPath: 'x/y'
    },
    expected: {
      type: 'GH_ORG',
      externalId: undefined,
      members: 'GH_ORG_MEMBER',
      admins: 'GH_ORG_MEMBER',
      public: false,
      linkPath: 'x/y'
    }
  },{
    name: 'type=GROUP, security=PRIVATE',
    options: {
      type: 'GROUP',
      security: 'PRIVATE',
      internalId: GROUPID
    },
    expected: {
      type: 'GROUP',
      members: 'INVITE',
      admins: 'GROUP_ADMIN',
      public: false,
      extraAdmins: [],
      extraMembers: [],
      internalId: GROUPID
    }
  },{
    name: 'type=GROUP, security=PUBLIC',
    options: {
      type: 'GROUP',
      security: 'PUBLIC',
      internalId: GROUPID
    },
    expected: {
      type: 'GROUP',
      members: 'PUBLIC',
      admins: 'GROUP_ADMIN',
      public: true,
      extraAdmins: [],
      extraMembers: [],
      internalId: GROUPID
    }
  },{
    name: 'type=GROUP, security=INHERITED',
    options: {
      type: 'GROUP',
      security: 'INHERITED',
      internalId: GROUPID
    },
    expected: {
      type: 'GROUP',
      members: 'INVITE_OR_ADMIN',
      admins: 'GROUP_ADMIN',
      public: false,
      extraAdmins: [],
      extraMembers: [],
      internalId: GROUPID
    }
  }];

  FIXTURES.forEach(function(META) {
    it(META.name, function() {
      var user = { _id: USERID, id: USERID.toHexString() };
      var result = securityDescriptorGenerator.generate(user, META.options);

      assert.deepEqual(result, META.expected);
    });
  })

});
