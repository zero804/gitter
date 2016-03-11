Gitter Webapp
=============

[![Coverage Status](https://coveralls.io/repos/troupe/gitter-webapp/badge.svg?branch=develop&service=github&t=IjAtJj)](https://coveralls.io/github/troupe/gitter-webapp?branch=develop)

Copyright Troupe Technology Limited 2012 - 2016
All rights reserved.



Please symlink pre-commit to .git/hooks/pre-commit to enable the pre-commit hooks.

Prerequisites
-------------
* node.js 0.10+ `brew install node`
* [Virtualbox](https://www.virtualbox.org/wiki/Downloads)
* [Kitematic](https://kitematic.com/) or `boot2docker` if you prefer
*

Getting Started
---------------
2. Open Kitematic and choose "Install Docker Commands" from the application menu.
3. In the root directory of the project run `./start` to start your services
4. `npm install`
5. `npm install -g gulp`
6. `gulp css` (compiles css)
7. `npm install -g nodemon`
8. `nodemon` (this will run node and restart when anything changes based on config in nodemon.json)

Data Upgrades
-------------
`./scripts/upgrade-data.sh` will run through the contents of scripts/dataupgrades and are ment to update mongo's contents idempotently (running the script multiple times will have no effect).

This is run as part of the beta build, but is **not** run as part of a production build. The *individual* upgrade script must be run manually.

* dev: run `./scripts/upgrade-data.sh` yourself
* beta: updated automatically as part of the make task
* prod: run the individual script yourself. e.g `./scripts/dataupgrades/001-oauth-client/002-add-redirect-uri.sh mongo-replica-member-003/gitter`

Run Like Production
-------------------
1.  `make grunt`
2.  `node web --web:staticContent=public-processed/ --web:minified=true`

Utility Scripts
---------------
These are scripts that can help you answer questions like "What's this user's eyeball state?" and "What's the userId for mydigitalself?". They can be found in `scripts/utils`.

If you want to run against production, ssh into app-00X and run with the `NODE_ENV` varible set.

e.g `NODE_ENV=prod /opt/gitter/gitter-webapp/scripts/utils/unread.js trevorah`

Also see https://github.com/gitterHQ/wiki/wiki/Support---Data-Maintenance

### online-state.js
Prints the current online state for a user. Requires a username.

e.g `./scripts/utils/online-state.js trevorah`

### mobile-notify-user.js
Sends a test push notification to all devices registered by user. Requires a username.

e.g `./scripts/utils/mobile-notify-user.js trevorah`

### unread.js
Lists out why a user has an unread badge. Requires a username.

e.g `./scripts/utils/unread.js trevorah`

### suggested-rooms.js
Lists out the rooms suggested to a user. Requires a username.

e.g `./scripts/utils/suggested-rooms.js trevorah`

### whois.js
Looks up users from ids. Requires user ids.

e.g `./scripts/utils/whois.js 53bec5764bf9c36505409389`

### update-room-tags.js
Updates the tags used by the explore page.

e.g `./scripts/utils/update-room-tags.js`

### delete-room.js
Deletes a room and kicks users out. Requires a room uri.

e.g `./scripts/utils/delete-room.js --uri trevorah/noembed`

### remove-user.js
Removes a user from all room and destroys their auth tokens. Requires a username.

e.g `./scripts/utils/remove-user.js --username trevorah`

### migrate-messages.js
Migrates all chat messages from one room to another. Requires two rooms.

e.g `./scripts/utils/migrate-messages.js --from trevorah/oldroom --to trevorah/newroom`


### redirect-room.js

Redirect `roomA` to `roomB`. *note:* this will delete `roomA`

e.g `./scripts/utils/redirect-room.js -f fromroom -t toroom`


### node hellban.js <username> [options]

username     username to hellban e.g trevorah

Options:
   -u, --unban   unban user from hell


### start-new-feature

Create a feature branch and a matching pull request. This also does some nicety stuff so we can properly see test coverage from Coveralls.

`./start-new-feature my-new-feature-branch`


Upgrading gitter-services to add support for more services
----------------------------------------------------------
Recently merged a pull request for [gitter-services](https://github.com/gitterHQ/services)? then read on…

### Prerequisites
Before you proceed, make sure you have done the following:
1. pushed a tagged release of gitter-services to github
2. updated the gitter-services dependency in [webhookshandler](https://bitbucket.org/troupe/webhookshandler) via npm
3. deployed the new webhookshandler (dont worry, your new service wont be accessible unless someone is adept at guessing urls)

### Updating gitter-services
Once you are sure the above is done, preform the following:
1. update the version of the `gitter-services` dependency in package.json (dont forget about npm-shrinkwrap)
2. `npm install`
3. `make sprites`
4. commit your changes and release!

## Adjusting Feature Toggles

Use the `./scripts/utils/feature-toggle.js` script to adjust feature toggles:

For example,

```shell
# Include suprememoocow and trevorah in the test
NODE_ENV=beta ./scripts/utils/feature-toggle.js fancy-new-feature --include-user suprememoocow --include-user trevorah

# Exclude users from the test
NODE_ENV=beta ./scripts/utils/feature-toggle.js fancy-new-feature --exclude-user suprememoocow --exclude-user trevorah

# Include a percentage of all users
NODE_ENV=beta ./scripts/utils/feature-toggle.js fancy-new-feature --percentage 70

# Undo "include a percentage of all users"
NODE_ENV=beta ./scripts/utils/feature-toggle.js fancy-new-feature --percentage-off

# Include everyone
NODE_ENV=beta ./scripts/utils/feature-toggle.js fancy-new-feature --enable

# Undo "include everyone"
NODE_ENV=beta ./scripts/utils/feature-toggle.js fancy-new-feature --enable-off

# Disable Chrome, version 47 and below
NODE_ENV=beta ./scripts/utils/feature-toggle.js fancy-new-feature --disable-browser Chrome:47

# Disable all versions of IE
NODE_ENV=beta ./scripts/utils/feature-toggle.js fancy-new-feature --disable-browser IE:all

# Renable the feature for Chrome
NODE_ENV=beta ./scripts/utils/feature-toggle.js fancy-new-feature --disable-browser-off Chrome
```

To turn on and off features manually in your browser:

```
https://beta.gitter.im/api_web/features/[feature]/[0/1]
```

For example:

```
https://beta.gitter.im/api_web/features/chat-cache/1
```

## Setting up ElasticSearch

1. Install ElasticSearch 1.2.2
  1. `cd $(brew --prefix)`
  2. `git checkout afe0820 /usr/local/Library/Formula/elasticsearch.rb` - version 1.3.4
  3. `brew install elasticsearch`  (remember to brew unlink elasticsearch if you've already got another version installed)

2. You might need to install [JDK](http://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html)

3. Ensure that your ansible repo is up-to-date: git@github.com:troupe/ansible.git

4. In the ansible project, change directory to `roles/elasticsearch/files/elastic-config`

5. Run `./XX-setup-plugins`

5. Start elasticsearch from the root of gitter-webapp: `./start-elasticsearch.sh`

6. Setup the mappings: `./01-create-index-with-mapping` (make sure your gitter-webapp is running before doing this...)

7. Setup the rivers: `./02-create-rivers`

8. Setup the alias: `./03-setup-alias`

9. Watch the elasticsearch logs for success, something like:

```
[2014-10-20 22:04:09,790][INFO ][cluster.metadata         ] [Brain-Child] [_river] update_mapping [gitterUserRiver] (dynamic)
[2014-10-20 22:04:09,805][INFO ][org.elasticsearch.river.mongodb.Slurper] MongoDBRiver is beginning initial import of gitter.users
[2014-10-20 22:04:09,810][INFO ][org.elasticsearch.river.mongodb.Slurper] Collection users - count: 8
[2014-10-20 22:04:09,815][INFO ][org.elasticsearch.river.mongodb.Slurper] Number documents indexed: 8
[2014-10-20 22:04:11,231][INFO ][org.elasticsearch.river.mongodb.MongoDBRiver] Starting river gitterChatRiver
[2014-10-20 22:04:13,086][INFO ][org.elasticsearch.river.mongodb.Slurper] Collection chatmessages - count: 22903
[2014-10-20 22:04:27,307][INFO ][org.elasticsearch.river.mongodb.Slurper] Number documents indexed: 21541
```

10. Log into HQ: http://localhost:9200/_plugin/HQ Connect

11. Check that there are lots of documents under the Gitter index.

## Updating the Social Graph

The social graph updater runs as a batch job in a cron every few hours. You can manually invoke it as follows.

```shell
NODE_ENV=beta node scripts/graphs/upload-graph.js
```

The uploader script starts a local webserver, and it will guess the URL for that webserver by looking at the host computers
network interfaces. If you want to the script against production from your developer computer, you'll need to specify the OpenVPN
tunnel interface, otherwise the script will serve from a URL inaccessible from OpenVPN.

You can do this as follows:
```shell
NODE_ENV=prod LISTEN_IF=utun0 node scripts/graphs/upload-graph.js
```

## Auto Lurk Script
```shell
NODE_ENV=prod scripts/utils/auto-lurk-room.js --members 30000 --min 31
```

Testing
-----------------------

All unit tests etc can be run with `npm test`

Tests run in the browser context will not be included within the above command.
To tun these tests you will need these variables within your `env`:

BROWSERSTACK_USERNAME
BROWSERSTACK_KEY

Once you have these you can run `npm run test:unit:browser` which should kick off the tests via browserstack



## Shrinkwrap Cheatsheat

### 1. I've got a conflict in my shrinkwrap

1. Merge any conflicts in your `package.json`, but ignore conflicts in your `npm-shrinkwrap.json`
2. Run `npm run npm shrinkwrap-conflict`
2. Commit your changes to `npm-shrinkwrap.json` and `package.json`

### 2. I would like to add a dev-dependency

1. Use the normal `npm install x@y --save-dev` command
2. Commit your changes to `package.json`

### 3. I would like to add a runtime dependency

1. Use `gulp safe-install --package module@version`
2. Commit your changes to `npm-shrinkwrap.json` and `package.json`

### 4. The shrinkwrap file is completely screwed up. Can I recreate it?

1. Use `npm clean-shrinkwrap`
2. Commit your changes to `npm-shrinkwrap.json`
