"use strict";

var proxyquireNoCallThru = require("proxyquire").noCallThru();
var assert = require('assert');
var Promise = require('bluebird');

var mockito = require('jsmockito').JsMockito;

var user;
var permissionsModel;
var userIsInRoomMock;
var orgPermissionsMock;

/*****************************************************************/

describe('ORG_CHANNEL', function() {
  var uri = 'x/custom';
  var parentUri = 'x';

  beforeEach(function() {
    user = { username: 'gitterbob' };

    userIsInRoomMock = mockito.mockFunction();
    orgPermissionsMock = mockito.mockFunction();

    mockito.when(orgPermissionsMock)().then(function() {
      assert(false, 'THIS MOCK STILL NEEDS TO BE CONFIGURED');
    });

    permissionsModel = proxyquireNoCallThru("../../lib/models/org-channel-permissions-model", {
      './org-permissions-model': orgPermissionsMock,
      '../user-in-room': userIsInRoomMock
    });

  });



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

            mockito.when(orgPermissionsMock)().then(function(user, right, org) {
              assert.equal(org, parentUri);
              return Promise.resolve(m[usergroup]);
            });

            return permissionsModel(user, right, uri, security)
              .then(function(granted) {
                assert(granted);
              })
              .nodeify(done);
          });
        });

        rights[right].denied.forEach(function(usergroup) {
          it('should deny ' + usergroup, function(done) {

            mockito.when(orgPermissionsMock)().then(function(user, right, org) {
              assert.equal(org, parentUri);
              return Promise.resolve(m[usergroup]);
            });

            return permissionsModel(user, right, uri, security)
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

    //    return permissionsModel(user, right, uri, security)
    //      .then(function(granted) {
    //        assert(granted);
    //      })
    //      .nodeify(done);
    //  });

    //});

    //describe('adduser', function() {
    //  var right = 'adduser';

    //  it('should allow', function(done) {
    //    return permissionsModel(user, right, uri, security)
    //      .then(function(granted) {
    //        assert(granted);
    //      })
    //      .nodeify(done);
    //  });

    //});



    //describe('create', function() {
    //  var right = 'create';

    //  it('should allow for org members', function(done) {
    //    mockito.when(orgPermissionsMock)().then(function(user, right, org) {
    //      assert.equal(org, parentUri);
    //      return Promise.resolve(true);
    //    });

    //    return permissionsModel(user, right, uri, security)
    //      .then(function(granted) {
    //        assert(granted);
    //      })
    //      .nodeify(done);
    //  });

    //  it('should deny for non org members', function(done) {
    //    mockito.when(orgPermissionsMock)().then(function(user, right, org) {
    //      assert.equal(org, parentUri);
    //      return Promise.resolve(false);
    //    });

    //    return permissionsModel(user, right, uri, security)
    //      .then(function(granted) {
    //        assert(!granted);
    //      })
    //      .nodeify(done);
    //  });

    //});

    //describe('admin', function() {
    //  var right = 'admin';

    //  it('should allow', function(done) {
    //    mockito.when(orgPermissionsMock)().then(function(user, right, org) {
    //      assert.equal(org, parentUri);
    //      return Promise.resolve(true);
    //    });

    //    return permissionsModel(user, right, uri, security)
    //      .then(function(granted) {
    //        assert(granted);
    //      })
    //      .nodeify(done);
    //  });

    //  it('should deny', function(done) {
    //    mockito.when(orgPermissionsMock)().then(function(user, right, org) {
    //      assert.equal(org, parentUri);
    //      return Promise.resolve(false);
    //    });

    //    return permissionsModel(user, right, uri, security)
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
          return Promise.resolve(true);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

      it('should deny somebody not already in the room', function(done) {
        mockito.when(userIsInRoomMock)().then(function(pUri, pUser) {
          assert.equal(pUri, uri);
          assert.equal(pUser, user);
          return Promise.resolve(false);
        });

        return permissionsModel(user, right, uri, security)
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
          return Promise.resolve(true);
        });

        mockito.when(orgPermissionsMock)().then(function(user, right, org) {
          assert.equal(org, parentUri);
          return Promise.resolve(true);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

      it('should deny org members not in the room to add', function(done) {
        mockito.when(userIsInRoomMock)().then(function(pUri, pUser) {
          assert.equal(pUri, uri);
          assert.equal(pUser, user);
          return Promise.resolve(false);
        });

        mockito.when(orgPermissionsMock)().then(function(user, right, org) {
          assert.equal(org, parentUri);
          return Promise.resolve(true);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });


      it('should deny non org members add', function(done) {

        mockito.when(orgPermissionsMock)().then(function(user, right, org) {
          assert.equal(org, parentUri);
          return Promise.resolve(false);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });

    });

    describe('create', function() {
      var right = 'create';

      it('should allow for org members', function(done) {
        mockito.when(orgPermissionsMock)().then(function(user, right, org) {
          assert.equal(org, parentUri);
          return Promise.resolve(true);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

      it('should deny for non org members', function(done) {
        mockito.when(orgPermissionsMock)().then(function(user, right, org) {
          assert.equal(org, parentUri);
          return Promise.resolve(false);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });

    });

    describe('admin', function() {
      var right = 'admin';

      it('should allow org members', function(done) {
        mockito.when(orgPermissionsMock)().then(function(user, right, org) {
          assert.equal(org, parentUri);
          return Promise.resolve(true);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

      it('should deny non org members', function(done) {
        mockito.when(orgPermissionsMock)().then(function(user, right, org) {
          assert.equal(org, parentUri);
          return Promise.resolve(false);
        });

        return permissionsModel(user, right, uri, security)
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
        mockito.when(orgPermissionsMock)().then(function(user, right, org) {
          assert.equal(org, parentUri);
          return Promise.resolve(true);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

      it('should deny non org members', function(done) {
        mockito.when(orgPermissionsMock)().then(function(user, right, org) {
          assert.equal(org, parentUri);
          return Promise.resolve(false);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });

    });

    describe('adduser', function() {
      var right = 'adduser';

      it('should allow org members to add', function(done) {
        mockito.when(orgPermissionsMock)().then(function(user, right, org) {
          assert.equal(org, parentUri);
          return Promise.resolve(true);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });


      it('should deny non org members add', function(done) {
        mockito.when(orgPermissionsMock)().then(function(user, right, org) {
          assert.equal(org, parentUri);
          return Promise.resolve(false);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });

    });

    describe('create', function() {
      var right = 'create';

      it('should allow for org members', function(done) {
        mockito.when(orgPermissionsMock)().then(function(user, right, org) {
          assert.equal(org, parentUri);
          return Promise.resolve(true);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

      it('should deny for non org members', function(done) {
        mockito.when(orgPermissionsMock)().then(function(user, right, org) {
          assert.equal(org, parentUri);
          return Promise.resolve(false);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });

    });

    describe('admin', function() {
      var right = 'admin';

      it('should allow org members', function(done) {
        mockito.when(orgPermissionsMock)().then(function(user, right, org) {
          assert.equal(org, parentUri);
          return Promise.resolve(true);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

      it('should deny non org members', function(done) {
        mockito.when(orgPermissionsMock)().then(function(user, right, org) {
          assert.equal(org, parentUri);
          return Promise.resolve(false);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });

    });


  });
});
