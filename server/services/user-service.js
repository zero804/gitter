var persistence = require("./persistence-service");

module.exports = {
  newUser: function(options) {
    var user = new persistence.User(options);
    user.name = options.name;
    user.email = options.email;
    user.save(function (err) {
      console.log("Save failed:" + JSON.stringify(err) + ", " + err );
    });

    console.log("saved user")
  },

  findExistingUser: function(email, callback) {
    persistence.User.findOne({email: email}, function(err, user) {
      callback(err, user);
    });
  }
};