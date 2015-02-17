var speedy = require ("speedy");
var persistence = require('../../server/services/persistence-service');

var userIds = ['54355e03a6cf90638955c368', '5437c126c74d515442c792c5', '543ea21969fbc77aa6c097e6', '543ea2c569fbc77aa6c097e7'];
var userId = userIds[0];

speedy.samples (10);

speedy.run ({
  inClause: function (done) {
    return persistence.User.findQ({ _id: { $in: userId }})
      .nodeify(done);
  },
  orClause: function (done) {
    return persistence.User.findQ({ _id: userId })
      .nodeify(done);
  },
});
