'use strict';

const shutdown = require('shutdown');

const Promise = require('bluebird');
const fs = require('fs-extra');
const outputFile = Promise.promisify(fs.outputFile);
const mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');
const persistence = require('gitter-web-persistence');
const groupService = require('gitter-web-groups');
const emailAddressService = require('gitter-web-email-addresses');

const findGroupAdminUsers = require('./lib/find-group-admin-users');

let existingForumAdminMap = {};
try {
  existingForumAdminMap = require('./forum-admin-map.json');
} catch(err) {
  console.log('Existing forum admin map does not exist or can\'t be parsed but we can continue onward', err);
}

const forumCursor = persistence.Forum.find()
  .lean()
  .read(mongoReadPrefs.secondaryPreferred)
  .batchSize(100)
  .cursor();


const userIdToEmailMap = {};
const forumAdminMap = existingForumAdminMap || {};

let forumsProcessedCount = 0;

forumCursor.eachAsync(function(forum) {
  // Watch out for groups created by tests. We only care about "real" groups that are always based on group permissions
  if(forum.sd.type !== 'GROUP') {
    console.log(`Skipping ${forum.uri} because it doesn't have a group sd type`);
    return;
  }

  console.log(`Procesing forum ${forum.uri}`);

  const groupPromise = groupService.findById(forum.sd.internalId);

  const adminUsersPromise = groupPromise
    .then((group) => {
      if (!group) {
        console.warn(`\tSkipping: Group with ID ${forum.sd.internalId} does not exist`);
        return [];
      }
      else if(forumAdminMap[group.uri]) {
        console.warn(`\tSkipping: Group is already in the admin map (yay cache)`);
        return forumAdminMap[group.uri];
      }

      return findGroupAdminUsers(group);
    })
    .then((adminUsers) => {
      return Promise.map(adminUsers, (adminUser) => {
        let potentialCachedEmail = userIdToEmailMap[adminUser.id] || adminUser.email;

        return (potentialCachedEmail ? Promise.resolve(potentialCachedEmail) : emailAddressService(adminUser))
          .catch((err) => {
            console.log(`Unable to fetch email for ${adminUser.username}`, err);
          })
          .then((email) => {
            if(email) {
              // Cache it in case of a duplicate later on
              userIdToEmailMap[adminUser.id] = email;

              adminUser.email = email;
            }
            return adminUser;
          })
      });
    })

  return Promise.props({
    group: groupPromise,
    adminUsers: adminUsersPromise
  })
    .then(({ group, adminUsers }) => {
      if(group) {
        forumsProcessedCount++;
        forumAdminMap[group.uri] = adminUsers;

        // Just try saving off the file every so often to make sure we don't lose any partial data we may collect
        if (forumsProcessedCount % 5 === 0) {
          return outputFile('scripts/utils/forum-admin-map.json', JSON.stringify(forumAdminMap, null, 2));
        }
      }
    });
})
  .then(function() {
    console.log('forumAdminMap', forumAdminMap);

    return outputFile('scripts/utils/forum-admin-map.json', JSON.stringify(forumAdminMap, null, 2));
  })
  .then(() => {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error(err);
    console.error(err.stack);
    process.exit(1);
    shutdown.shutdownGracefully(1);
  });
