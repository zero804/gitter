'use strict';

const assert = require('assert');
const Promise = require('bluebird');
const proxyquireNoCallThru = require('proxyquire').noCallThru();

describe('gl-group-policy-delegate', function() {
  const GROUP1_USER = { _id: 1, username: 'x_gitlab' };
  const NOT_GROUP1_USER = { _id: 2, username: 'y_gitlab' };
  const NON_GITLAB_USER = { _id: 2, username: 'y' };
  const INVALID_USER = { _id: 3 };
  const GROUP1 = 'group1';

  const FIXTURES = [
    {
      name: 'is group member',
      group: GROUP1,
      user: GROUP1_USER,
      policy: 'GL_GROUP_MEMBER',
      expectedResult: true
    },
    {
      name: 'is not group member',
      group: GROUP1,
      user: NOT_GROUP1_USER,
      policy: 'GL_GROUP_MEMBER',
      expectedResult: false
    },
    {
      name: 'is not a GitLab user',
      group: GROUP1,
      user: NON_GITLAB_USER,
      policy: 'GL_GROUP_MEMBER',
      expectedResult: false
    },
    {
      name: 'anonymous',
      group: GROUP1,
      user: null,
      policy: 'GL_GROUP_MEMBER',
      expectedResult: false
    },
    {
      name: 'user sans username',
      group: GROUP1,
      user: INVALID_USER,
      policy: 'GL_GROUP_MEMBER',
      expectedResult: false
    },
    {
      name: 'invalid policy',
      group: GROUP1,
      user: INVALID_USER,
      policy: 'INVALID',
      expectedResult: false
    }
  ];

  let GlGroupPolicyDelegate;
  function StubGitLabGroupService(user) {
    this.isMember = Promise.method(function(uri, username) {
      if (uri === GROUP1) {
        if (user === GROUP1_USER && username === user.username) {
          return true;
        }
      }

      return false;
    });
  }

  function stubGetIdentityForUser(user, provider) {
    if ((provider === 'gitlab' && user === GROUP1_USER) || user === NOT_GROUP1_USER) {
      return { fakeProvider: true, providerKey: user.username };
    }

    return null;
  }

  before(function() {
    GlGroupPolicyDelegate = proxyquireNoCallThru('../../lib/policies/gl-group-policy-delegate', {
      'gitter-web-gitlab': {
        GitLabGroupService: StubGitLabGroupService
      },
      'gitter-web-identity': {
        getIdentityForUser: stubGetIdentityForUser
      }
    });
  });

  FIXTURES.forEach(function(meta) {
    it(meta.name, function() {
      const securityDescriptor = {
        linkPath: meta.group
      };

      const user = meta.user;
      const userId = user && user._id;

      function userLoader() {
        return Promise.resolve(user);
      }

      var delegate = new GlGroupPolicyDelegate(userId, userLoader, securityDescriptor);

      return delegate.hasPolicy(meta.policy).then(
        function(result) {
          if (meta.expectedResult === 'throw') {
            assert.ok(false, 'Expected exception');
          }
          assert.strictEqual(result, meta.expectedResult);
        },
        function(err) {
          if (meta.expectedResult !== 'throw') {
            throw err;
          }
        }
      );
    });
  });
});
