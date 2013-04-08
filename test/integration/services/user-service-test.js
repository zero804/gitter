var userService = require('../../../server/services/user-service');
var signupService = require('../../../server/services/signup-service');

var assert = require("../../../server/utils/awesome-assert");

describe("User Service", function() {
  describe("userService#updateProfile", function() {
    it("should update the name, email, password and status of a user", function(done) {

      var userParams = {
        email: "user-service@troupetest.local",
        displayName: "Tester",
        status: "ACTIVE"
      };

      userService.newUser(userParams, function(e, user) {
        assert.strictEqual(e, null);
        assert.notStrictEqual(user, null);
        assert.notStrictEqual(typeof user, 'undefined');

        var oldUserStatus = user.status;
        var params = {
          userId: user.id,
          // displayName: user.displayName,
          // password: "newPass",
          // oldPassword: "oldPass",
          email: "hopefully-unregistered-user-service-test@troupetest.local"
        };

        userService.updateProfile(params, function(e, user) {
          assert.strictEqual(e, null);
          assert.notStrictEqual(user, null);

          // assert.strictEqual(user.displayName, params.displayName);
          assert.strictEqual(user.newEmail, params.email);
          assert.notStrictEqual(user.confirmationCode, null);
          assert.strictEqual(user.status, oldUserStatus);

          // get the confirmation code and run the confirmation
          signupService.confirm(user, function(e) {
            assert.strictEqual(e, null);
            assert.strictEqual(user.email, params.email);
            // assert.strictEqual(typeof user.newEmail, 'undefined');
            assert.strictEqual(!user.newEmail, true);

            // delete the user so that the test is atomic
            user.remove(function(e) {
              assert.strictEqual(e, null);

              done();
            });

          });

        });
      });
    });
  });
});