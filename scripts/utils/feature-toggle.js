#!/usr/bin/env node

'use strict';

var opts = require("nomnom")
   .option('name', {
     position: 0,
     required: true,
     list: false,
     help: 'Name of feature'
   })
   .option('description',{
     required: false,
     list: false,
     help: 'Description of feature'
   })
   .option('include-user', {
     list: true,
     help: 'Username of user to allow'
   })
   .option('exclude-user', {
     list: true,
     help: 'Username of user to exclude'
   })
   .option('percentage', {
     help: 'Percentage of users to allow'
   })
   .option('percentage-off', {
     flag: true,
     help: 'Turn off percentage'
   })
   .option('disable-browser', {
     help: 'Disable a specific browser, up to a given version. eg "Chrome:47" or "Safari:all". Browser family names come from npm package `useragent`.',
     list: true
   })
   .option('disable-browser-off', {
     help: 'Renable for a specific browser, eg "Chrome"',
     list: true
   })
   .option('enable', {
     flag: true,
     help: 'Enabled'
   })
   .option('enable-off', {
     flag: true,
     help: 'Turn off enabled'
   })
   .parse();

 if (!opts.name) {
  console.error('Name required');
  process.exit(1);
}

var FeatureToggle = require("../../server/services/persistence-service").FeatureToggle;


function runWithOpts(opts) {
  var set = { };
  var unset = { };

  var includeUsers = opts['include-user'];
  if (includeUsers) {
    includeUsers.forEach(function(username) {
      set['criteria.allowUsernames.' + username] = 1;
    });
  }

  var excludeUsers = opts['exclude-user'];
  if (excludeUsers) {
    excludeUsers.forEach(function(username) {
      unset['criteria.allowUsernames.' + username] = true;
    });
  }

  var disableBrowser = opts['disable-browser'];
  if (disableBrowser) {
    disableBrowser.forEach(function(browserVersion) {
      var pair = browserVersion.split(':');
      var browserName = pair[0];
      var version = parseInt(pair[1], 10) || 'all';
      set['criteria.disableBrowser.' + browserName] = version;
    });
  }

  var disableBrowserOff = opts['disable-browser-off'];
  if (disableBrowserOff) {
    disableBrowserOff.forEach(function(browser) {
      unset['criteria.disableBrowser.' + browser] = true;
    });
  }

  var percentage = parseInt(opts.percentage, 10);
  if (percentage >= 0) {
    set['criteria.percentageOfUsers'] = percentage;
  }

  if (opts['percentage-off']) {
    unset['criteria.percentageOfUsers'] = true;
  }

  if (opts.enable) {
    set['criteria.enabled'] = true;
  }

  if (opts['enable-off']) {
    unset['criteria.enabled'] = true;
  }

  if (opts.description) {
    set['description'] = opts.description;
  }

  var update = {
    $setOnInsert: {
      name: opts.name
    }
  };

  if (Object.keys(set).length) {
    update.$set = set;
  }

  if (Object.keys(unset).length) {
    update.$unset = unset;
  }

  return FeatureToggle.findOneAndUpdate({ name: opts.name }, update,
      { upsert: true, new: true })
    .exec()
    .then(function(result) {
      console.log(result.toJSON());
    });
}


runWithOpts(opts)
  .then(function() {
    process.exit(0);
  })
  .catch(function(err) {
    console.error(err.stack);
    process.exit(1);
  })
  .done();
