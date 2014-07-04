var service = require('../../server/services/notifications/notification-generator-service');

var opts = require("nomnom")
  .option('userId', {
    abbr: 'u',
    required: true,
    help: 'User to find'
  })
  .option('troupeId', {
    abbr: 't',
    required: true,
    help: 'Troupe to find'
  })
  .parse();

service.testOnly.userCategorisationStrategy([opts], function(err, groups) {
  if(err) return console.log(err);

  console.log(groups);
});
