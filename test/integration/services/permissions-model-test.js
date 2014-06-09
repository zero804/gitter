/*jslint node:true, unused:true*/
/*global describe:true, it:true, beforeEach */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var Q = require('q');

var mockito = require('jsmockito').JsMockito;

function GitHubOrgServiceMocker() {
  this.member = orgMemberMethodMock;
}

function GitHubRepoServiceMocker() {
  this.getRepo = getRepoMethodMock;
}

var permissionsModel, orgMemberMethodMock, getRepoMethodMock, userIsInRoomMock;

beforeEach(function() {
  userIsInRoomMock = mockito.mockFunction();
  orgMemberMethodMock = mockito.mockFunction();
  getRepoMethodMock = mockito.mockFunction();
  permissionsModel = testRequire.withProxies("./services/permissions-model", {
    './github/github-repo-service': GitHubRepoServiceMocker,
    './github/github-org-service': GitHubOrgServiceMocker,
    './user-in-room': userIsInRoomMock
  });
});

describe('permissions-model', function() {
  var user = { username: 'gitterbob' };

  describe('ORGS', function() {

    var roomType = 'ORG';
    var security = null;
    var uri = 'x';

    // mock for each usergroup
    var m = {
      members: true,
      not_members: false
    };

    var rights = {
      view: {
        allowed:  ['members'],
        denied:   ['not_members']
      },
      join: {
        allowed:  ['members'],
        denied:   ['not_members']
      },
      adduser: {
        allowed:  ['members'],
        denied:   ['not_members']
      },
      create: {
        allowed:  ['members'],
        denied:   ['not_members']
      },
      admin: {
        allowed:  ['members'],
        denied:   ['not_members']
      }
    };

    Object.keys(rights).forEach(function(right) {

      describe(right, function() {
        rights[right].allowed.forEach(function(usergroup) {
          it('should allow ' + usergroup, function(done) {

            mockito.when(orgMemberMethodMock)().then(function(org) {
              assert.equal(org, uri);
              return Q.resolve(m[usergroup]);
            });

            return permissionsModel(user, right, uri, roomType, security)
              .then(function(granted) {
                assert(granted);
              })
              .nodeify(done);
          });
        });

        rights[right].denied.forEach(function(usergroup) {
          it('should deny ' + usergroup, function(done) {

            mockito.when(orgMemberMethodMock)().then(function(org) {
              assert.equal(org, uri);
              return Q.resolve(m[usergroup]);
            });

            return permissionsModel(user, right, uri, roomType, security)
              .then(function(granted) {
                assert(!granted);
              })
              .nodeify(done);
          });
        });
      });

    });

  });

  /*****************************************************************/

  describe('REPOs', function() {

    var roomType = 'REPO';
    var uri = 'x/y';



    describe('PRIVATE', function() {
      var security = 'PRIVATE';

      // mocks for each usergroup
      var m = {
        members: true,
        not_members: false,
        people_with_push_access: {permissions: {push: true}},
        people_with_admin_access: {permissions: {admin: true}},
        people_with_pull_access_only: {permissions: {pull: true}}
      };

      var rights = {
        view: {
          allowed:  ['members'],
          denied:   ['not_members']
        },
        join: {
          allowed:  ['members'],
          denied:   ['not_members']
        },
        adduser: {
          allowed:  ['members'],
          denied:   ['not_members']
        },
        create: {
          allowed:  ['people_with_push_access', 'people_with_admin_access'],
          denied:   ['not_members', 'people_with_pull_access_only']
        },
        admin: {
          allowed:  ['people_with_push_access', 'people_with_admin_access'],
          denied:   ['not_members', 'people_with_pull_access_only']
        }
      };

      Object.keys(rights).forEach(function(right) {

        describe(right, function() {
          rights[right].allowed.forEach(function(usergroup) {
            it('should allow ' + usergroup, function(done) {

              mockito.when(getRepoMethodMock)().then(function(org) {
                assert.equal(org, uri);
                return Q.resolve(m[usergroup]);
              });

              return permissionsModel(user, right, uri, roomType, security)
                .then(function(granted) {
                  assert(granted);
                })
                .nodeify(done);
            });
          });

          rights[right].denied.forEach(function(usergroup) {
            it('should deny ' + usergroup, function(done) {

              mockito.when(getRepoMethodMock)().then(function(org) {
                assert.equal(org, uri);
                return Q.resolve(m[usergroup]);
              });

              return permissionsModel(user, right, uri, roomType, security)
                .then(function(granted) {
                  assert(!granted);
                })
                .nodeify(done);
            });
          });
        });

      });

    });

    describe('PUBLIC', function() {
      var security = 'PUBLIC';

      // mocks for each usergroup
      var m = {
        members: true,
        not_members: false,
        people_with_push_access: {permissions: {push: true}},
        people_with_admin_access: {permissions: {admin: true}},
        people_with_pull_access_only: {permissions: {pull: true}}
      };

      var rights = {
        view: {
          allowed:  ['members'],
          denied:   []
        },
        join: {
          allowed:  ['members'],
          denied:   ['not_members']
        },
        adduser: {
          allowed:  ['members'],
          denied:   ['not_members']
        },
        create: {
          allowed:  ['people_with_push_access', 'people_with_admin_access'],
          denied:   ['not_members', 'people_with_pull_access_only']
        },
        admin: {
          allowed:  ['people_with_push_access', 'people_with_admin_access'],
          denied:   ['not_members', 'people_with_pull_access_only']
        }
      };

      Object.keys(rights).forEach(function(right) {

        describe(right, function() {
          rights[right].allowed.forEach(function(usergroup) {
            it('should allow ' + usergroup, function(done) {

              mockito.when(getRepoMethodMock)().then(function(org) {
                assert.equal(org, uri);
                return Q.resolve(m[usergroup]);
              });

              return permissionsModel(user, right, uri, roomType, security)
                .then(function(granted) {
                  assert(granted);
                })
                .nodeify(done);
            });
          });

          rights[right].denied.forEach(function(usergroup) {
            it('should deny ' + usergroup, function(done) {

              mockito.when(getRepoMethodMock)().then(function(org) {
                assert.equal(org, uri);
                return Q.resolve(m[usergroup]);
              });

              return permissionsModel(user, right, uri, roomType, security)
                .then(function(granted) {
                  assert(!granted);
                })
                .nodeify(done);
            });
          });
        });
      });

    });
  });

  /*****************************************************************/

  describe('ONETOONE', function() {

    var roomType = 'ONETOONE';
    var security = null;
    var uri = 'x';

    describe('join', function() {
      var right = 'join';

      it('should allow', function(done) {
        return permissionsModel(user, right, uri, roomType, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

    });

    describe('adduser', function() {
      var right = 'adduser';

      it('should deny', function(done) {
        return permissionsModel(user, right, uri, roomType, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });

    });


    describe('create', function() {
      var right = 'create';

      it('should allow', function(done) {
        return permissionsModel(user, right, uri, roomType, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

    });

    describe('admin', function() {
      var right = 'admin';

      it('should deny', function(done) {
        return permissionsModel(user, right, uri, roomType, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });

    });

  });

  /*****************************************************************/

  describe('ORG_CHANNEL', function() {
    var roomType = 'ORG_CHANNEL';
    var uri = 'x/custom';
    var parentUri = 'x';

    describe('PUBLIC', function() {

      var security = 'PUBLIC';

      // mock for each usergroup
      var m = {
        members: true,
        not_members: false
      };


      var rights = {
        view: {
          allowed:  ['members'],
          denied:   []
        },
        join: {
          allowed:  ['members'],
          denied:   []
        },
        adduser: {
          allowed:  ['members'],
          denied:   []
        },
        create: {
          allowed:  ['members'],
          denied:   ['not_members']
        },
        admin: {
          allowed:  ['members'],
          denied:   ['not_members']
        }
      };

      Object.keys(rights).forEach(function(right) {

        describe(right, function() {
          rights[right].allowed.forEach(function(usergroup) {
            it('should allow ' + usergroup, function(done) {

              mockito.when(orgMemberMethodMock)().then(function(org) {
                assert.equal(org, parentUri);
                return Q.resolve(m[usergroup]);
              });

              return permissionsModel(user, right, uri, roomType, security)
                .then(function(granted) {
                  assert(granted);
                })
                .nodeify(done);
            });
          });

          rights[right].denied.forEach(function(usergroup) {
            it('should deny ' + usergroup, function(done) {

              mockito.when(orgMemberMethodMock)().then(function(org) {
                assert.equal(org, parentUri);
                return Q.resolve(m[usergroup]);
              });

              return permissionsModel(user, right, uri, roomType, security)
                .then(function(granted) {
                  assert(!granted);
                })
                .nodeify(done);
            });
          });
        });
      });



      //describe('join', function() {
      //  var right = 'join';

      //  it('should allow', function(done) {

      //    return permissionsModel(user, right, uri, roomType, security)
      //      .then(function(granted) {
      //        assert(granted);
      //      })
      //      .nodeify(done);
      //  });

      //});

      //describe('adduser', function() {
      //  var right = 'adduser';

      //  it('should allow', function(done) {
      //    return permissionsModel(user, right, uri, roomType, security)
      //      .then(function(granted) {
      //        assert(granted);
      //      })
      //      .nodeify(done);
      //  });

      //});



      //describe('create', function() {
      //  var right = 'create';

      //  it('should allow for org members', function(done) {
      //    mockito.when(orgMemberMethodMock)().then(function(org) {
      //      assert.equal(org, parentUri);
      //      return Q.resolve(true);
      //    });

      //    return permissionsModel(user, right, uri, roomType, security)
      //      .then(function(granted) {
      //        assert(granted);
      //      })
      //      .nodeify(done);
      //  });

      //  it('should deny for non org members', function(done) {
      //    mockito.when(orgMemberMethodMock)().then(function(org) {
      //      assert.equal(org, parentUri);
      //      return Q.resolve(false);
      //    });

      //    return permissionsModel(user, right, uri, roomType, security)
      //      .then(function(granted) {
      //        assert(!granted);
      //      })
      //      .nodeify(done);
      //  });

      //});

      //describe('admin', function() {
      //  var right = 'admin';

      //  it('should allow', function(done) {
      //    mockito.when(orgMemberMethodMock)().then(function(org) {
      //      assert.equal(org, parentUri);
      //      return Q.resolve(true);
      //    });

      //    return permissionsModel(user, right, uri, roomType, security)
      //      .then(function(granted) {
      //        assert(granted);
      //      })
      //      .nodeify(done);
      //  });

      //  it('should deny', function(done) {
      //    mockito.when(orgMemberMethodMock)().then(function(org) {
      //      assert.equal(org, parentUri);
      //      return Q.resolve(false);
      //    });

      //    return permissionsModel(user, right, uri, roomType, security)
      //      .then(function(granted) {
      //        assert(!granted);
      //      })
      //      .nodeify(done);
      //  });

      //});


    });

    describe('PRIVATE', function() {

      var security = 'PRIVATE';

      describe('join', function() {
        var right = 'join';

        it('should allow somebody already in the room', function(done) {
          mockito.when(userIsInRoomMock)().then(function(pUri, pUser) {
            assert.equal(pUri, uri);
            assert.equal(pUser, user);
            return Q.resolve(true);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should deny somebody not already in the room', function(done) {
          mockito.when(userIsInRoomMock)().then(function(pUri, pUser) {
            assert.equal(pUri, uri);
            assert.equal(pUser, user);
            return Q.resolve(false);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

      });

      describe('adduser', function() {
        var right = 'adduser';

        it('should allow org members in the room to add', function(done) {
          mockito.when(userIsInRoomMock)().then(function(pUri, pUser) {
            assert.equal(pUri, uri);
            assert.equal(pUser, user);
            return Q.resolve(true);
          });

          mockito.when(orgMemberMethodMock)().then(function(org) {
            assert.equal(org, parentUri);
            return Q.resolve(true);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should deny org members not in the room to add', function(done) {
          mockito.when(userIsInRoomMock)().then(function(pUri, pUser) {
            assert.equal(pUri, uri);
            assert.equal(pUser, user);
            return Q.resolve(false);
          });

          mockito.when(orgMemberMethodMock)().then(function(org) {
            assert.equal(org, parentUri);
            return Q.resolve(true);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });


        it('should deny non org members add', function(done) {

          mockito.when(orgMemberMethodMock)().then(function(org) {
            assert.equal(org, parentUri);
            return Q.resolve(false);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

      });

      describe('create', function() {
        var right = 'create';

        it('should allow for org members', function(done) {
          mockito.when(orgMemberMethodMock)().then(function(org) {
            assert.equal(org, parentUri);
            return Q.resolve(true);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should deny for non org members', function(done) {
          mockito.when(orgMemberMethodMock)().then(function(org) {
            assert.equal(org, parentUri);
            return Q.resolve(false);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

      });

      describe('admin', function() {
        var right = 'admin';

        it('should allow org members', function(done) {
          mockito.when(orgMemberMethodMock)().then(function(org) {
            assert.equal(org, parentUri);
            return Q.resolve(true);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should deny non org members', function(done) {
          mockito.when(orgMemberMethodMock)().then(function(org) {
            assert.equal(org, parentUri);
            return Q.resolve(false);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

      });


    });

    describe('INHERITED', function() {
      var security = 'INHERITED';

      describe('join', function() {
        var right = 'join';

        it('should allow org members', function(done) {
          mockito.when(orgMemberMethodMock)().then(function(org) {
            assert.equal(org, parentUri);
            return Q.resolve(true);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should deny non org members', function(done) {
          mockito.when(orgMemberMethodMock)().then(function(org) {
            assert.equal(org, parentUri);
            return Q.resolve(false);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

      });

      describe('adduser', function() {
        var right = 'adduser';

        it('should allow org members to add', function(done) {
          mockito.when(orgMemberMethodMock)().then(function(org) {
            assert.equal(org, parentUri);
            return Q.resolve(true);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });


        it('should deny non org members add', function(done) {
          mockito.when(orgMemberMethodMock)().then(function(org) {
            assert.equal(org, parentUri);
            return Q.resolve(false);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

      });

      describe('create', function() {
        var right = 'create';

        it('should allow for org members', function(done) {
          mockito.when(orgMemberMethodMock)().then(function(org) {
            assert.equal(org, parentUri);
            return Q.resolve(true);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should deny for non org members', function(done) {
          mockito.when(orgMemberMethodMock)().then(function(org) {
            assert.equal(org, parentUri);
            return Q.resolve(false);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

      });

      describe('admin', function() {
        var right = 'admin';

        it('should allow org members', function(done) {
          mockito.when(orgMemberMethodMock)().then(function(org) {
            assert.equal(org, parentUri);
            return Q.resolve(true);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should deny non org members', function(done) {
          mockito.when(orgMemberMethodMock)().then(function(org) {
            assert.equal(org, parentUri);
            return Q.resolve(false);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

      });


    });
  });

  /*****************************************************************/

  describe('REPO_CHANNEL', function() {
    var roomType = 'REPO_CHANNEL';
    var uri = 'x/custom';
    var parentUri = 'x';

    describe('PUBLIC', function() {

      var security = 'PUBLIC';

      describe('join', function() {
        var right = 'join';

        it('should allow', function(done) {
          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

      });

      describe('adduser', function() {
        var right = 'adduser';

        it('should allow', function(done) {
          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

      });


      describe('create', function() {
        var right = 'create';

        it('should allow for repo push members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve({ permissions: { push: true } });
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should allow for repo admin members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve({ permissions: { admin: true } });
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should deny for repo pull members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve({ permissions: { pull: true } });
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

        it('should deny for non repo members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve(null);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

      });

      describe('admin', function() {
        var right = 'admin';

        it('should allow for repo push members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve({ permissions: { push: true } });
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should allow for repo admin members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve({ permissions: { admin: true } });
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should deny for repo pull members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve({ permissions: { pull: true } });
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

        it('should deny for non repo members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve(null);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });
      });

    });

    describe('PRIVATE', function() {
      var security = 'PRIVATE';

      describe('join', function() {
        var right = 'join';

        it('should allow somebody already in the room', function(done) {
          mockito.when(userIsInRoomMock)().then(function(pUri, pUser) {
            assert.equal(pUri, uri);
            assert.equal(pUser, user);
            return Q.resolve(true);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should deny somebody not already in the room', function(done) {
          mockito.when(userIsInRoomMock)().then(function(pUri, pUser) {
            assert.equal(pUri, uri);
            assert.equal(pUser, user);
            return Q.resolve(false);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

      });

      describe('adduser', function() {
        var right = 'adduser';

        it('should allow repo members in the room to add', function(done) {
          mockito.when(userIsInRoomMock)().then(function(pUri, pUser) {
            assert.equal(pUri, uri);
            assert.equal(pUser, user);
            return Q.resolve(true);
          });

          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve(true);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should deny repo members not in the room to add', function(done) {
          mockito.when(userIsInRoomMock)().then(function(pUri, pUser) {
            assert.equal(pUri, uri);
            assert.equal(pUser, user);
            return Q.resolve(false);
          });

          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve(true);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });


        it('should deny non repo members add', function(done) {

          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve(false);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

      });

      describe('create', function() {
        var right = 'create';

        it('should allow for repo admin members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve({ permissions: { admin: true } });
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should allow for repo push members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve({ permissions: { push: true } });
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });


        it('should deny for repo pull members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve({ permissions: { pull: true } });
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

        it('should deny for non repo members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve();
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

      });

      describe('admin', function() {
        var right = 'admin';

        it('should allow repo admin members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve({ permissions: { admin: true } });
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should allow repo push members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve({ permissions: { push: true } });
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });


        it('should deny repo pull members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve({ permissions: { pull: true } });
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

        it('should deny non repo members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve();
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

      });

    });

    describe('INHERITED', function() {
      var security = 'INHERITED';

      describe('join', function() {
        var right = 'join';

        it('should allow repo members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve({ permissions: { pull: true } });
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should deny non repo members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve(null);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

      });

      describe('adduser', function() {
        var right = 'adduser';

        it('should allow repo members to add', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve({ permissions: { pull: true } });
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });


        it('should deny non repo members add', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve();
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

      });

      describe('create', function() {
        var right = 'create';

        it('should allow for repo admin members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve({ permissions: { admin: true } });
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should allow for repo push members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve({ permissions: { push: true } });
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should deny for repo pull members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve({ permissions: { pull: true } });
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

        it('should deny for non repo members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve();
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

      });

      describe('admin', function() {
        var right = 'admin';


        it('should allow for repo admin members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve({ permissions: { admin: true } });
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should allow for repo push members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve({ permissions: { push: true } });
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should deny for repo pull members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve({ permissions: { pull: true } });
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

        it('should deny for non repo members', function(done) {
          mockito.when(getRepoMethodMock)().then(function(repo) {
            assert.equal(repo, parentUri);
            return Q.resolve();
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

      });


    });
  });

  /*****************************************************************/

  describe('USER_CHANNEL', function() {
    var roomType = 'USER_CHANNEL';
    var uri = 'gitterclare/custom';
    var user2 = { username: 'gitterclare' };

    describe('PUBLIC', function() {
      var security = 'PUBLIC';

      describe('join', function() {
        var right = 'join';

        it('should allow', function(done) {
          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

      });

      describe('adduser', function() {
        var right = 'adduser';


        it('should allow', function(done) {
          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

      });


      describe('create', function() {
        var right = 'create';

        it('should allow for the owner', function(done) {
          return permissionsModel(user2, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should deny for non owner', function(done) {
          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

      });

      describe('admin', function() {
        var right = 'admin';

        it('should allow for the owner', function(done) {
          return permissionsModel(user2, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should deny for non owner', function(done) {
          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });
      });


    });

    describe('PRIVATE', function() {
      var security = 'PRIVATE';

      describe('join', function() {
        var right = 'join';

        it('should allow people already in the room', function(done) {
          mockito.when(userIsInRoomMock)().then(function(pUri, pUser) {
            assert.equal(pUri, uri);
            assert.equal(pUser, user);
            return Q.resolve(true);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should deny people not already in the room', function(done) {
          mockito.when(userIsInRoomMock)().then(function(pUri, pUser) {
            assert.equal(pUri, uri);
            assert.equal(pUser, user);
            return Q.resolve(false);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

      });

      describe('adduser', function() {
        var right = 'adduser';

        it('should allow for the owner', function(done) {
          return permissionsModel(user2, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should allow for somebody in the room', function(done) {
          mockito.when(userIsInRoomMock)().then(function(pUri, pUser) {
            assert.equal(pUri, uri);
            assert.equal(pUser, user);
            return Q.resolve(true);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });


        it('should deny somebody not in the room', function(done) {
          mockito.when(userIsInRoomMock)().then(function(pUri, pUser) {
            assert.equal(pUri, uri);
            assert.equal(pUser, user);
            return Q.resolve(false);
          });

          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });
      });


      describe('create', function() {
        var right = 'create';

        it('should allow for the owner', function(done) {
          return permissionsModel(user2, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should deny for non owner', function(done) {
          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });

      });

      describe('admin', function() {
        var right = 'admin';

        it('should allow for the owner', function(done) {
          return permissionsModel(user2, right, uri, roomType, security)
            .then(function(granted) {
              assert(granted);
            })
            .nodeify(done);
        });

        it('should deny for non owner', function(done) {
          return permissionsModel(user, right, uri, roomType, security)
            .then(function(granted) {
              assert(!granted);
            })
            .nodeify(done);
        });
      });



    });


  });


});
