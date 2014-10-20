Gitter Webapp
=============

Copyright Troupe Technology Limited 2012 - 2014
All rights reserved.

Please symlink pre-commit to .git/hooks/pre-commit to enable the pre-commit hooks.

Prerequisites
-------------
Redis 2.8 (Sentinel 2 is shipped with Redis 2.8) & MongoDB 2.4 must be installed.

Getting Started
---------------
1.  `npm install`
2.  `grunt css`
3.  `./mongodb.sh`
4.  `./redis.sh`
5.  `./scripts/mongo/init-dev-mongo.sh`
6.  `./scripts/upgrade-data.sh`
7.  `nodemon` (this will run node and restart when anything changes based on config in nodemon.json)

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

If you want to run against production, ssh into app-00X and run with the NODE_ENV varible set.

e.g `NODE_ENV=prod /opt/gitter/gitter-webapp/scripts/utils/unread.js trevorah`

### online-state.js
Prints the current online state for a user. Requires a username.

e.g `./scripts/utils/online-state.js trevorah`

### unread.js
Lists out why a user has an unread badge. Requires a username.

e.g `./scripts/utils/unread.js trevorah`

### suggested-rooms.js
Lists out the rooms suggested to a user. Requires a username.

e.g `./scripts/utils/suggested-rooms.js trevorah`

### update-room-tags.js
Updates the tags used by the explore page.

e.g `./scripts/utils/update-room-tags.js`

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

## Setting up ElasticSearch

1. Install ElasticSearch 1.2.2
  1. `cd $(brew --prefix)`
  2. `git checkout 97e96ed /usr/local/Library/Formula/elasticsearch.rb`
  3. `brew install elasticsearch`

2. Install required ElasticSearch plugins
  1. `/usr/local/Cellar/elasticsearch/1.2.2/bin/plugin  --install elasticsearch/elasticsearch-lang-javascript/2.4.0`
  2. `/usr/local/Cellar/elasticsearch/1.2.2/bin/plugin   --install com.github.richardwilly98.elasticsearch/elasticsearch-river-mongodb/2.0.1`
  3. `/usr/local/Cellar/elasticsearch/1.2.2/bin/plugin --install royrusso/elasticsearch-HQ`

3. Start elasticsearch from the root of gitter-webapp: `./start-elasticsearch.sh`

4. Ensure that your ansible repo is up-to-date: git@github.com:troupe/ansible.git

5. In the ansible project, change directory to `roles/elasticsearch/files/elastic-config`

6. Setup the mappings: `./01-create-index-with-mapping`

7. Setup the rivers: `./02-create-rivers`

8. Watch the elasticsearch logs for success, something like:

```
[2014-10-20 22:04:09,790][INFO ][cluster.metadata         ] [Brain-Child] [_river] update_mapping [gitterUserRiver] (dynamic)
[2014-10-20 22:04:09,805][INFO ][org.elasticsearch.river.mongodb.Slurper] MongoDBRiver is beginning initial import of gitter.users
[2014-10-20 22:04:09,810][INFO ][org.elasticsearch.river.mongodb.Slurper] Collection users - count: 8
[2014-10-20 22:04:09,815][INFO ][org.elasticsearch.river.mongodb.Slurper] Number documents indexed: 8
[2014-10-20 22:04:11,231][INFO ][org.elasticsearch.river.mongodb.MongoDBRiver] Starting river gitterChatRiver
[2014-10-20 22:04:13,086][INFO ][org.elasticsearch.river.mongodb.Slurper] Collection chatmessages - count: 22903
[2014-10-20 22:04:27,307][INFO ][org.elasticsearch.river.mongodb.Slurper] Number documents indexed: 21541
```

9. Log into HQ: http://localhost:9200/_plugin/HQ -> Connect 

10. Check that there are lots of documents under the Gitter index.
