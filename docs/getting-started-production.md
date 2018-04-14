
Some useful notes for a Gitter developer/engineer that may have to touch production.

 - Infrastructure code (Ansible), https://gitlab.com/gl-infra/gitter-infrastructure
 - Infrastructure deploy tools (shell scripts), https://github.com/troupe/deploy-tools

## See what code/commit is running on production or next

- `prod`
   - https://gitter.im/api_web/private/health_check
   - https://gitter.im/api_private/private/health_check or https://api.gitter.im/api/private/health_check
- `staging` (`next`)
   - https://gitter.im/api_web/private/health_check
   - https://gitter.im/api_staging/private/health_check or https://api-staging.gitter.im/api/private/health_check
- `beta`
   - https://beta.gitter.im/api_web/private/health_check
   - https://beta.gitter.im/api/private/health_check or https://api-beta.gitter.im/api/private/health_check
- `beta-staging`
   - https://beta.gitter.im/api_web/private/health_check
   - https://beta.gitter.im/api_staging/private/health_check or https://beta-staging.gitter.im/api/private/health_check


## Restart servers

Restart servers

 - production: ` cd /opt/gitter-infrastructure/ansible && ansible-playbook -i prod playbooks/gitter/restart-services.yml -vvv -t nonstaging --diff`
 - staging (`next`): ` cd /opt/gitter-infrastructure/ansible && ansible-playbook -i prod playbooks/gitter/restart-services.yml -vvv -t staging --diff`
 - beta: ` cd /opt/gitter-infrastructure/ansible && ansible-playbook -i beta playbooks/gitter/restart-services.yml -vvv -t nonstaging --diff`
 - beta-staging: ` cd /opt/gitter-infrastructure/ansible && ansible-playbook -i beta playbooks/gitter/restart-services.yml -vvv -t staging --diff`

## Stop and start a service/process (like Elasticsearch)

Stop Elasticsearch

```
service monit stop
service elasticsearch stop
```

Start Elasticsearch

```
service elasticsearch start
service monit start
```



## Find Gitter internal network hostnames/IPs

Visit the following pages or run the commands from one of internal Gitter servers

 - prod: https://console.aws.amazon.com/route53/home?region=us-east-1#resource-record-sets:ZLV6X5P28OJXS
    - `aws route53 list-resource-record-sets --hosted-zone-id ZLV6X5P28OJXS`
 - beta: https://console.aws.amazon.com/route53/home?region=us-east-1#resource-record-sets:Z37MTOMQF7KDHA
    - `aws route53 list-resource-record-sets --hosted-zone-id Z37MTOMQF7KDHA`


## SSH to boxes

 - Production `gitter.im`: `ssh deployer@webapp-01`
 - Beta `beta.gitter.im`: `ssh gitter-beta`


## Configure secrets

Production secrets are located here, https://gitlab.com/gl-gitter/secrets/tree/master/webapp

 - Production
    - production: `eval $(../secrets/webapp/env prod)`
    - staging (`next`): `eval $(../secrets/webapp/env prod-staging)`
    - beta: `eval $(/opt/gitter/secrets/webapp/env beta)`
    - beta-staging: `eval $(/opt/gitter/secrets/webapp/env beta-staging)`
 - Locally: See https://gitlab.com/gitlab-org/gitter/webapp#configure-service-secrets

### Update secrets on servers

Here is an example to update the secrets repo on the beta app servers

```
cd /opt/gitter-infrastructure/ansible/ && ansible-playbook -i beta --vault-password-file "/root/.vault_pass" playbooks/gitter/secrets.yml -vvvv
```


## Production logging

 - `ssh deployer@webapp-01`
    - `/var/log/upstart` -> `less gitter-web-1.log`
 - `ssh deployer@gitter-beta`
    - `/var/log/upstart` -> `less gitter-web-staging-1.log`
 - [Kibana](http://logging.prod.gitter:5601/app/kibana), for help see https://www.elastic.co/guide/en/beats/packetbeat/current/_kibana_queries_and_filters.html

### Get logs locally (off the server)

```sh
# On gitter-beta.beta.gitter, run,
$ mkdir -p /home/deployer/delete-me-logs/ && cp /var/log/upstart/gitter-web-staging-1.log /home/deployer/delete-me-logs/gitter-web-staging-1-beta.log && chown deployer /home/deployer/delete-me-logs/gitter-web-staging-1-beta.log
# Locally run,
$ mkdir -p ~/Downloads/gitter-logs && scp deployer@gitter-beta.beta.gitter:/home/deployer/delete-me-logs/gitter-web-staging-1-beta.log ~/Downloads/gitter-logs
# See gitter-web-staging-1-beta.log
```


### Debugging the application

This application uses [`debug`](https://github.com/visionmedia/debug) for debugging.

The debugging hierarchy is as follows:
* `gitter`: all debug categories inside `gitter-webapp` should start with this
  * `app`: application logic
    * Everything starting with `gitter:app:*` should be used for application logic. Another way to think of this category is that if you run the app with `DEBUG=gitter:app:*` you should be given a clear idea of the flow through the application as user requests are handled.
    * (further levels tbd)
  * `infra`: infrastructure
    * Everything starting with `gitter:infra:*` should be used for infrastructure/plumbing events. For example, worker messages. These categories should not be used for application logic
    * (further levels tbd)
  * `test`: debugging in tests

**TL;dd:** To get an idea of what's happening to serve your requests, use:

```shell
DEBUG=gitter:app:*
DEBUG="gitter:*,-gitter:redis-client,-gitter:mongo"
```


## Release/Deploy Cycle

We follow git-flow, https://danielkummer.github.io/git-flow-cheatsheet/

 - If you push that `feature/branch` it will build to `beta-staging`
 - `develop` || `hotfix/` branch will build to `beta`
 - `release/` go onto `staging` (`next`)
 - Manually start a production build to go onto `production`



## Mongo DB

Connect to one of the mongo instances (see below)

 - `show dbs`
 - `show collections`
    - `db.troupes`: Rooms
    - `db.users`: Users


### Production

```
mongo mongo-replica-01.prod.gitter
use gitter
```

### Beta

```
mongo mongo-beta-01.beta.gitter:27017
use gitter
```

### Local Mongo

You can find these aliases in `./start` -> `setupHostAlias`

```
mongo localhost:27017
use gitter
```


### Copy-pasta

#### Kill long-running query

Find the opid of the trouble query

```js
db.currentOp(
   {
     "active" : true,
     "secs_running" : { "$gt" : 3 }
   }
)
```

```js
db.killOp(xxx)
```

#### Deleting messages

##### Delete a single message

```js
db.chatmessages.update({ "_id" : ObjectId("REPLACE_THIS_WITH_ID") }, { $set: { "text" : "", "html" : "" } });
```

##### Delete all messages from a user in a room

```js
db.chatmessages.update({
  fromUserId: db.users.findOne({ username: 'USERNAME' })._id,
  toTroupeId: db.troupes.findOne({ lcUri: 'LOWERCASE_ROOM_URI' })._id
}, {
  $set: { text: '', html: '' }
} , { multi: true })
```

##### Delete all messages from a user

See `script/utils/delete-messages-from-user.js` instead


#### Recreate a dummy "Lobby" room

```js
db.troupes.insert({
        "lcUri" : "somecommunity/lobby",
        "providers" : [ ],
        "sd" : {
                "internalId" : db.groups.findOne({ lcUri: 'somecommunity' })._id,
                "extraAdmins" : [ ],
                "extraMembers" : [ ],
                "members" : "PUBLIC",
                "public" : true,
                "admins" : "GROUP_ADMIN",
                "type" : "GROUP"
        },
        "userCount" : 0,
        "uri" : "somecommunity/Lobby",
        "topic" : "",
        "groupId" : db.groups.findOne({ lcUri: 'somecommunity' })._id,
});
```


#### Re-subscribe and enable email notifications

```
db.usersettings.update({ userId: db.users.findOne({ username: 'something' })._id }, { $unset: { 'settings.unread_notifications_optout': true } } )
```


#### Working with tokens

##### Listing a user's tokens

```js
db.oauthaccesstokens.find({ userId: db.users.findOne({ username: 'XXX' }, { _id: 1 })._id })
```

##### Listing just a user's personal access token

```js
db.oauthaccesstokens.find({
  userId: db.users.findOne({ username: 'XXX' }, { _id: 1 })._id,
  clientId: db.oauthclients.findOne({ clientKey: "developer-prod" }, { _id: 1 })._id
})
```

##### Showing the time the token was issued (so you don't accidentally clear twice)

```js
db.oauthaccesstokens.findOne({
  userId: db.users.findOne({ username: 'XXX' }, { _id: 1 })._id,
  clientId: db.oauthclients.findOne({ clientKey: "developer-prod" }, { _id: 1 })._id
})._id.getTimestamp()
```

##### Deleting a token

See `script/utils/delete-token.js`



## Elasticsearch

 - http://es-01:9200/_plugin/head/
 - http://es-01:9200/_plugin/HQ
 - Mongo -> ES rivers, http://es-01:9200/_plugin/river-mongodb/


### Example queries

 - Visit [http://es-01:9200/_plugin/head/](http://es-01:9200/_plugin/head/)
 - Select "Any Request" tab:

#### Find messages from a given user

```
{
  "query": {
    "bool": {
      "must": [
        {
          "term": {
            "fromUserId": "XXXX"
          }
        }
      ],
      "must_not": [],
      "should": []
    }
  },
  "from": 0,
  "size": 50,
  "sort": [{
    "sent": {
      "order": "desc"
    }
  }],
  "aggs": {}
}
```

#### Find the latest messages in a given room

```
{
  "query": {
    "bool": {
      "must": [
        {
          "term": {
            "toTroupeId": "529c94dded5ab0b3bf04e16e"
          }
        }
      ],
      "must_not": [],
      "should": []
    }
  },
  "from": 0,
  "size": 500,
  "sort": [
    {
      "sent": {
        "order": "desc"
      }
    }
  ],
  "aggs": {}
}
```


#### Fix broken rivers

Mongo -> Elasticsearch rivers, https://github.com/richardwilly98/elasticsearch-river-mongodb

If search isn't giving results for recent messages, the rivers may be broken. You can check if the "Last Replicated" date is behind or "Documents Indexed" isn't incrementing when you send new messages.

Try starting and stopping: http://es-01:9200/_plugin/river-mongodb/

The river is based on the Mongo oplog. If the Mongo oplog is ahead of the river last replicated date(found here http://es-01:9200/_plugin/river-mongodb/) then you need to recreate the rivers.

```
$ mongo mongo-replica-01.prod.gitter
> db.getReplicationInfo()
{
        "logSizeMB" : 1024,
        "usedMB" : 1035.64,
        "timeDiff" : 62910,
        "timeDiffHours" : 17.48,
        "tFirst" : "Mon Apr 09 2018 10:11:52 GMT-0500 (Central Standard Time)",
        "tLast" : "Tue Apr 10 2018 03:40:22 GMT-0500 (Central Standard Time)",
        "now" : "Tue Apr 10 2018 03:40:19 GMT-0500 (Central Standard Time)"
}
```

##### Recreate rivers with prod servers

```
$ ssh deployer@webapp-01
$ cd /opt/gitter-infrastructure/ansible/roles/elasticsearch/instances/prod/files/elastic-config/
# increment `INDEX_VERSION`, `sudo su` -> `vim vars-prod-preset`
$ source vars-prod-preset
$ ./01-create-index-with-mapping
$ ./02-create-rivers
# Wait for the rivers to complete
$ ./03-setup-alias
# set `INDEX_VERSION` back to what it was temporarily so we can delete the old rivers
$ source vars-prod-preset
$ ./XX-delete-rivers
```

Afterwards, don't forget to update the infra repo with the new index version, https://gitlab.com/gl-infra/gitter-infrastructure/blob/master/ansible/roles/elasticsearch/instances/prod/files/elastic-config/vars-prod-preset

##### Recreate rivers in local development Docker

You can remove the ES Docker container, `docker rm webapp_elasticsearch_1`, and run `docker-compose up -d --no-recreate` again.


## Utility Scripts

These are scripts that can help you answer questions like "What's this user's eyeball state?" and "What's the userId for mydigitalself?". They can be found in `scripts/utils`.

If you want to run against production, ssh into app-00X and run with the `NODE_ENV` variable set.

e.g

 - On Servers: `eval $(../secrets/webapp/env prod)` -> `NODE_ENV=prod npm run nodeselektor -- /opt/gitter/gitter-webapp/scripts/utils/unread.js trevorah`
    - production: `eval $(../secrets/webapp/env prod)`
    - staging (`next`): `eval $(../secrets/webapp/env prod-staging)`
    - beta: `eval $(/opt/gitter/secrets/webapp/env beta)`
    - beta-staging: `eval $(/opt/gitter/secrets/webapp/env beta-staging)`
 - Locally: [configure secrets](https://gitlab.com/gitlab-org/gitter/webapp#configure-service-secrets) then `NODE_ENV=prod npm run nodeselektor -- ./scripts/utils/unread.js trevorah`

Also see https://github.com/gitterHQ/wiki/wiki/Support---Data-Maintenance


### `auto-lurk-room.js`

```shell
NODE_ENV=prod npm run nodeselektor -- scripts/utils/auto-lurk-room.js --members 30000 --min 31
```


### `delete-messages-from-user.js`

Delete all messages for a given user

```
./scripts/utils/delete-messages-from-user.js --username someusername
# Delete more messages if they have more
./scripts/utils/delete-messages-from-user.js --username someusername --limit 30000
# Dry run to see what will be deleted
./scripts/utils/delete-messages-from-user.js --username someusername --limit 30000 --grep "badmessage" --dry
# Actually delete
./scripts/utils/delete-messages-from-user.js --username someusername --limit 30000 --grep "badmessage"
```


### `delete-room.js`

Deletes a room and kicks users out. Requires a room uri.

e.g `./scripts/utils/delete-room.js --uri trevorah/noembed`


### `delete-token.js`

```
cd scripts/utils
NODE_ENV=prod ./delete-token.js -t XXXXXXXXXX
```


### `hellban.js`

Hellbanning a user will still let them send messages but they won't actually
show up in the room or even be persisted.

Ban user `badusername`, e.g `./scripts/utils/migrate-messages.js --username badusername`
Unban user `badusername`, e.g `./scripts/utils/migrate-messages.js --username badusername -u`


### `migrate-messages.js`

Migrates all chat messages from one room to another. Requires two rooms.

e.g `./scripts/utils/migrate-messages.js --from trevorah/oldroom --to trevorah/newroom`


### `mobile-notify-user.js`

Sends a test push notification to all devices registered by user. Requires a username.

e.g `./scripts/utils/mobile-notify-user.js trevorah`


### `online-state.js`

Prints the current online state for a user. Requires a username.

e.g `./scripts/utils/online-state.js trevorah`


### `redirect-room.js`

Redirect `roomA` to `roomB`. *note:* this will delete `roomA`

e.g `./scripts/utils/redirect-room.js -f fromroom -t toroom`


### `remove-user.js`

Removes a user from all room and destroys their auth tokens. Requires a username.

e.g `./scripts/utils/remove-user.js --username trevorah`


### `suggested-rooms.js`

Lists out the rooms suggested to a user. Requires a username.

e.g `./scripts/utils/suggested-rooms.js trevorah`


### `update-room-tags.js`

Updates the tags used by the explore page.

e.g `./scripts/utils/update-room-tags.js`


### `unread.js`

Lists out why a user has an unread badge. Requires a username.

e.g `./scripts/utils/unread.js trevorah`


### `whois.js`

Looks up users from ids. Requires user ids.

e.g `./scripts/utils/whois.js 53bec5764bf9c36505409389`



## Adjusting Feature Toggles

Use the `./scripts/utils/feature-toggle.js` script to adjust feature toggles:

For example,

```shell
# Include suprememoocow and trevorah in the test
NODE_ENV=beta npm run nodeselektor -- ./scripts/utils/feature-toggle.js fancy-new-feature --include-user suprememoocow --include-user trevorah

# Exclude users from the test
NODE_ENV=beta npm run nodeselektor -- ./scripts/utils/feature-toggle.js fancy-new-feature --exclude-user suprememoocow --exclude-user trevorah

# Include a percentage of all users
NODE_ENV=beta npm run nodeselektor -- ./scripts/utils/feature-toggle.js fancy-new-feature --percentage 70

# Undo "include a percentage of all users"
NODE_ENV=beta npm run nodeselektor -- ./scripts/utils/feature-toggle.js fancy-new-feature --percentage-off

# Include everyone
NODE_ENV=beta npm run nodeselektor -- ./scripts/utils/feature-toggle.js fancy-new-feature --enable

# Undo "include everyone"
NODE_ENV=beta npm run nodeselektor -- ./scripts/utils/feature-toggle.js fancy-new-feature --enable-off

# Disable Chrome, version 47 and below
NODE_ENV=beta npm run nodeselektor -- ./scripts/utils/feature-toggle.js fancy-new-feature --disable-browser Chrome:47

# Disable all versions of IE
NODE_ENV=beta npm run nodeselektor -- ./scripts/utils/feature-toggle.js fancy-new-feature --disable-browser IE:all

# Renable the feature for Chrome
NODE_ENV=beta npm run nodeselektor -- ./scripts/utils/feature-toggle.js fancy-new-feature --disable-browser-off Chrome
```

To turn on and off features manually in your browser:

```
http://localhost:5000/api_web/features/[feature]/[0/1]
```

For example:

```
http://localhost:5000/api_web/features/chat-cache/1
```


## Updating the Social Graph

The social graph updater runs as a batch job in a cron every few hours. You can manually invoke it as follows.

```shell
NODE_ENV=beta npm run nodeselektor -- ./scripts/graphs/upload-graph.js
```

The uploader script starts a local webserver, and it will guess the URL for that webserver by looking at the host computers
network interfaces. If you want to the script against production from your developer computer, you'll need to specify the OpenVPN
tunnel interface, otherwise the script will serve from a URL inaccessible from OpenVPN.

You can do this as follows:
```shell
NODE_ENV=prod LISTEN_IF=utun0 node scripts/graphs/upload-graph.js
```
