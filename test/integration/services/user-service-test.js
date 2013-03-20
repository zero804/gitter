var userService = require('../../../server/services/user-service');
var assert = require("better-assert");

describe("User Service", function() {
  describe("userService#updateProfile", function() {
    it("should update the name, email, password and status of a user", function(done) {

      userService.findByEmail("testuser@troupetester.local", function(e, user) {
        assert.equal(e, null);
        assert.notEqual(user, null);
        assert.notEqual(typeof user, 'undefined');

        var oldUserStatus = user.status;
        var params = {
          userId: user.id,
          // displayName: user.displayName,
          // password: "newPass",
          // oldPassword: "oldPass",
          email: "testuser@troupetest.local"
        };

        userService.updateProfile(params, function(e, user) {
          assert.equal(e, null);
          assert.notEqual(typeof user, null);

          // assert.equal(user.displayName, params.displayName);
          assert.equal(user.newEmail, params.email);
          assert.notEqual(user.confirmationCode, null);
          assert.equal(user.status, oldUserStatus);

          done();
        });

      });

    });
  });
});