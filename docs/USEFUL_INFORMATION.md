Utility Scripts
---------------
These are scripts that can help you answer questions like "What's this user's eyeball state?" and "What's the userId for mydigitalself?". They can be found in `scripts/utils`.

If you want to run against production, ssh into app-00X and run with the `NODE_ENV` varible set.

e.g

 - On Servers: `NODE_ENV=prod npm run nodeselektor -- /opt/gitter/gitter-webapp/scripts/utils/unread.js trevorah`
 - Locally: `NODE_ENV=prod npm run nodeselektor -- ./scripts/utils/unread.js trevorah`

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

Upgrading gitter-services to add support for more services (integrations)
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

## Auto Lurk Script
```shell
NODE_ENV=prod npm run nodeselektor -- scripts/utils/auto-lurk-room.js --members 30000 --min 31
```

Testing
-----------------------

All unit tests etc can be run with `npm test`

__Browser testing__
Running browser unit tests during development requires this command:

```
npm run browser-watch-test
```

Then open your favourite browser and view `http://localhost:9191/fixtures`. This page will live reload with you test changes when required.

To perform an automated test run use the following command:

```
npm run browser-test
```

this will run all tests in [devtool](https://www.npmjs.com/package/devtool).

## Shrinkwrap Cheatsheat

### 1. I've got a conflict in my shrinkwrap

1. Merge any conflicts in your `package.json`, but ignore conflicts in your `npm-shrinkwrap.json`
2. Run `npm run shrinkwrap` to rebuild the shrinkwrap
2. Commit your changes to `npm-shrinkwrap.json` and `package.json`

### 2. I would like to add a dev-dependency

1. Use the normal `npm install x@y --save-dev` command
2. Commit your changes to `package.json`

### 3. I would like to add a runtime dependency

1. Use `gulp safe-install --package module@version`
2. Commit your changes to `npm-shrinkwrap.json` and `package.json`

### 4. The shrinkwrap file is completely screwed up. Can I recreate it?

1. Run `npm run shrinkwrap` to rebuild the shrinkwrap
2. Commit your changes to `npm-shrinkwrap.json`

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

#### TL;dd

To get an idea of whats happening to serve your requests, use:

```shell
DEBUG=gitter:app:*
```


### Installing the correct `eslint` dependencies globally

Some development environments need to use globally installed eslint modules.

The quickest way to install these is using

`./build-scripts/install-eslint-globals.sh`
