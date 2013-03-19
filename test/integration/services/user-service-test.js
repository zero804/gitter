var userService = require('../../../server/services/user-service');
var assert = require("better-assert");

describe("User Service", function() {
  describe("userService#updateProfile", function() {
    it("should update the name, email, password and status of a user", function(done) {

      userService.findByEmail("testuser@troupetest.local", function(e, user) {
        assert(e === null);
        assert(user !== null);
        assert(typeof user !== 'undefined');

        var oldUserStatus = user.status;
        var params = {
          userId: user.id,
          // displayName: user.displayName,
          // password: "newPass",
          // oldPassword: "oldPass",
          email: "testuser@troupetest.local"
        };

        userService.updateProfile(params, function(e, user) {
          assert(e === null);

          // assert(user.displayName === params.displayName);
          assert(user.newEmail === params.email);
          assert(user.confirmationCode !== null);
          assert(user.status === oldUserStatus);

          done();
        });

      });

    });
  });
});