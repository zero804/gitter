# 19.54.0 - *upcoming*

 - Add dark-theme support to the Vue left-menu, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1463

Developer facing:

 - Restructure `supertest` tests that are running against the app, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1455
 - Only support the new style Transloadit `files_filtered` `avatar_thumnails_xxx` template, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1462
 - Update security release process, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1450


# 19.53.0 - 2019-6-27

 - Update `halley@0.7.0` -> `gitter-realtime-client@2.1.0` so `websocket` transport is chosen over `long-polling`, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1453
    - https://gitlab.com/gitlab-org/gitter/realtime-client/merge_requests/24
    - https://gitlab.com/gitlab-org/gitter/halley/merge_requests/10
 - Add unread indicators to all/people menu bar items with the Vue left-menu, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1447
 - Add 'Start a thread' option to the chat context menu (threaded conversations), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1448
 - Remove Vue left-menu from `/~embed` view used in Sidecar, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1457
 - Fix room search updating unread count with the Vue left-menu, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1456
 - Only hide Vue left-menu when mobile NLI, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1458


# 19.52.1 - 2019-6-27

 - Fix arbitrary file upload via community avatar upload, https://gitlab.com/gitlab-org/gitter/webapp/issues/2192
    - Thanks to `u3mur4` for [responsibly disclosing](https://about.gitlab.com/security/disclosure/) this vulnerability to us.
    - https://dev.gitlab.org/gitlab/gitter/webapp/merge_requests/10


# 19.52.0 - 2019-6-25

 - Fix integration settings throwing 500 error, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1451

Developer facing:

 - Also deploy to Next/staging with a `hotfix/` branch(git flow), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1449


# 19.51.0 - 2019-6-24

 - Add stats/metrics for the Vue left-menu, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1434
 - Add room favourite drag and drop to the Vue left-menu, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1431
 - Add mobile support to the Vue left-menu, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1435
 - Add highlight for current room with the Vue left-menu, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1439
 - Fix overflow scroll in Firefox with the Vue left-menu, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1440
 - Fix SPA room switcher to always just fallback to redirecting the window with the Vue left-menu (navigation, history), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1441
 - Add NLI support to Vue left-menu, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1436
 - Fix room search redirecting to non-joined rooms with the Vue left-menu, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1438
 - Fix mention in non-joined room so it shows up in the Vue left-menu, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1443
 - Be upfront about bugs in the mobile/desktop apps and transparent about what the Gitter team is focusing on, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1444
 - Add ability to hide feature toggles from the [next.gitter.im]](https://next.gitter.im/) UI, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1446

 Developer facing:

  - Add execution permissions to `scripts/utils/email-for-user.js`, `scripts/utils/list-group-admins.js` utility scripts (so we can run them on the server), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1442

# 19.50.1 - 2019-6-25
 - Fix room security policy to enforce the "Only GitHub users are allowed to join this room." rule, https://gitlab.com/gitlab-org/gitter/webapp/issues/2041
   - Thanks to @cache-money for [responsibly disclosing](https://about.gitlab.com/security/disclosure/) this vulnerability to us.
   - https://dev.gitlab.org/gitlab/gitter/webapp/merge_requests/7

# 19.50.0 - 2019-6-20

 - Fix profile menu missing on explore page, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1427
 - Fix create room redirection to newly created room with the Vue left-menu, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1428
 - Add hide room functionality to room settings dropdown, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1430
 - Add room search to Vue left-menu, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1423
 - Removed links to unavailable 3rd party apps
    - Thanks to [@schwedenmut](https://gitlab.com/schwedenmut) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1432
 - Add 10 per day rate-limit to email invites, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1433


# 19.49.0 - 2019-6-14

 - Fix typos throughout codebase
    - Thanks to [@yo](https://gitlab.com/yo) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1409
    - And another thanks to [@yo](https://gitlab.com/yo) :) for fixing one more typo, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1410
 - Fix production issue caused by code concerned with users in `invited` state, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1406
 - Add jump to message(permalinks) for search in the Vue left-menu, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1411
 - Add redirect for room switches for non-chat pages with the Vue left-menu, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1412
 - Move message timestamp next to username, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1415
 - Add Vue left-menu to `/home/explore`, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1413
 - Add Vue left-menu to `/home/learn`, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1422
 - Add Vue left-menu to `/<community>/home`, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1421
 - Add necessary styles for views presented by Vue left-menu, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1425

Developer facing:

 - Cleanup `user-loader-factory` in `permissions` module, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1424


# 19.48.0 - 2019-6-4

 - Introduce Vue left-menu v1 (behind [`vue-left-menu` feature flag](https://next.gitter.im/)), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1360

Developer facing:

 - Refactor `chat-internal` renderer to use async/await, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1401
 - Add Jest for Vue testing, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1404
 - Update all `test/public-js`(frontend) tests to use Jest, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1405
 - Add utility script to ban user from room, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1402
 - Fix missing `backbone.marionette` dependency when Vue server side rendering (SSR) in production, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1417
    - Move frontend dependencies from `devDependencies` to `dependencies` in `package.json`


# 19.47.1 - 2019-6-11

 - Disable invite/add emails until we add anti-spam measures, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1416
    - Disabling so we can ask Mandrill to unpause emails and get unread notifications flowing again, https://gitlab.com/gitlab-org/gitter/webapp/issues/2153

# 19.47.0 - 2019-5-28

 - Fix the Faye/Bayeux and stream API so it doesn't send messages to a user who was removed from a room, https://gitlab.com/gitlab-org/gitter/webapp/issues/2044
   - Thanks to @favicon for [responsibly disclosing](https://about.gitlab.com/security/disclosure/) this vulnerability to us.
   - https://dev.gitlab.org/gitlab/gitter/webapp/merge_requests/3

Developer facing:

 - Update `package.json` `engines` field to specify only Node.js v10 support, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1397
 - Introduce [Vue.js](https://vuejs.org/) into the codebase, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1396


# 19.46.0 - 2019-5-15

 - Fix integration activity XSS, https://gitlab.com/gitlab-org/gitter/webapp/issues/2068
     - Thanks to [@mishre](https://gitlab.com/mishre) for [responsibly disclosing](https://about.gitlab.com/security/disclosure/) this vulnerability to us.
    - https://dev.gitlab.org/gitlab/gitter/webapp/merge_requests/1

Developer facing:

 - Add docs on how to use debug logging for alt-click key not inserting permalink, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1393
    - Also adds debug logging for alt-click not inserting permalink
 - Adding `mongo-express` container for easy database browsing, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1395


# 19.45.0 - 2019-5-6

 - Add docs to clarify when email notifications are sent out, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1383
 - Add docs to clarify why email notifications are not sent when using IRC bridge, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1384
 - Add docs about how to get a permalink to a message, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1385
 - Add permalink functionality to chat archive, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1367

Developer facing:

 - Use npm@6 in CI, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1387
 - Add security harness git hook to restrict pushing to `dev.gitlab.org`, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1388


# 19.44.0 - 2019-4-19

Developer facing:

 - Let mobile asset build exit when running `NODE_ENV=prod`, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1380
 - Only run flakey tests on release, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1382


# 19.43.0 - 2019-4-18

Developer facing:

 - Fix mobile asset build not using `prod` env (Android, iOS), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1377


# 19.42.0 - 2019-4-16

 - Add documentation on how to manually configure of GitHub organisation integration/activity events
    - Thanks to [@io7m](https://gitlab.com/io7m) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1373
 - Add whitelist of available upgrade GitHub scopes, https://gitlab.com/gitlab-org/gitter/webapp/issues/2119
    - https://gitlab.com/MadLittleMods/webapp/merge_requests/23

Developer facing:

 - Use overlay2 storage driver on Docker build on CI
    - Thanks to [@tnir](https://gitlab.com/tnir) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1372


# 19.41.0 - 2019-3-29

 - Fix error thrown on archive navigation view by missing profile element so that the rest of the JavaScript runs, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1370
 - Fix commit reference short syntax decorations being mangled, `<group>/<project>@<commit sha>`
    - Thanks to [@peterhull90](https://gitlab.com/peterhull90) for the contribution, https://gitlab.com/gitlab-org/gitter/gitter-marked/merge_requests/11
    - https://gitlab.com/gitlab-org/gitter/gitter-markdown-processor/merge_requests/19
    - https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1371
 - Add better frontend UI feedback around account deletion request, https://gitlab.com/gitlab-com/gl-infra/production/issues/749
    - https://gitlab.com/MadLittleMods/webapp/merge_requests/20
 - Limit concurrency on removing room membership when deleting account, https://gitlab.com/gitlab-com/gl-infra/production/issues/749
    - https://gitlab.com/MadLittleMods/webapp/merge_requests/21


# 19.40.0 - 2019-3-21

 - Fix 500 NPE on community home with `undefined` user still with room membership, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1365
 - Restore user state when user signs in again after removing
    - Thanks to [@green-coder](https://gitlab.com/green-coder) and [@vicek22](https://gitlab.com/vicek22) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1362
 - Add new lines to end of quoted text to separate comments
    - Thanks to [@joserenan](https://gitlab.com/joserenan) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1366
 - Remove Gitter hiring/job link to left-menu, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1368


Developer facing:

 - Fix npm install failing on GitHub `backbone-events-standalone` dependency, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1364


# 19.39.1 - 2019-3-15

 - Add character limit to message edit endpoint, https://gitlab.com/gitlab-org/gitter/webapp/issues/2106
    - https://gitlab.com/MadLittleMods/webapp/merge_requests/18
 - Remove email returned by room invite endpoint, https://gitlab.com/gitlab-org/gitter/webapp/issues/2102
    - https://gitlab.com/MadLittleMods/webapp/merge_requests/17


# 19.39.0 - 2019-3-12

 - Use filled in star icon for favorite communities/rooms
    - Thanks to [@vicek22](https://gitlab.com/vicek22) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1351
 - Fix favorite star on community home
    - Thanks to [@vicek22](https://gitlab.com/vicek22) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1354
 - Update `@gitterhq/translations@1.9.1` dependency for Georgian(`ka`) translation fix, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1357
    - Thanks to [@davitperaze](https://gitlab.com/davitperaze) for the contribution, https://gitlab.com/gitlab-org/gitter/gitter-translations/merge_requests/69

Developer facing:

 - Add some docs on how to run a subset of tests, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1356
 - Add some comments about possible user states, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1355
 - Update eslint to use ECMAScript 2018 parser (we already Node.js 10)
    - Thanks to [@vicek22](https://gitlab.com/vicek22) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1358


# 19.38.0 - 2019-2-27

 - Make Gitter markdown readme badge snippet visible for all rooms (share modal)
    - Thanks to [@jamesgeorge007](https://gitlab.com/jamesgeorge007) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1324
  - On the homepage, use green caribbean button style for primary room creation action (just like community creation)
     - Thanks to [@gtsiolis](https://gitlab.com/gtsiolis) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1341
 - Update version badge at the top(`DEV`) to link to the GitLab repo
    - Thanks to [@vicek22](https://gitlab.com/vicek22) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1345
 - Update create room primary button(caribbean) style in `/home/explore` for better consistency
    - Thanks to [@gtsiolis](https://gitlab.com/gtsiolis) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1342
 - Update left menu explore button style(jaffa) for better consistency
    - Thanks to [@gtsiolis](https://gitlab.com/gtsiolis) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1350
 - Add "Open Source" link to `webapp` GitLab project repository on the homepage
    - Thanks to [@gtsiolis](https://gitlab.com/gtsiolis) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1346

Developer facing:

 - Fix mobile(Android/iOS) asset CI build missing `webpack-manifest.json`, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1347
 - Add docs on how Gitter uses Prettier for styling/formatting(lint), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1348
 - Update `.gitignore` to ignore anything `.env*` related to avoid leaking mis-named files or backup files created by editors
    - Thanks to [@gtsiolis](https://gitlab.com/gtsiolis) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1349
 - Fix `rename-room.js` util scripts so it can move room to a different group/community
    - Thanks to [@vicek22](https://gitlab.com/vicek22) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1344
 - Fix NPE when lowercasing emails on login/new-user, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1352


# 19.37.1 - 2019-2-26

 - Fix CSRF to sign in as another user (OAuth callback),
    - https://gitlab.com/gitlab-org/gitter/webapp/issues/2074
    - https://gitlab.com/gitlab-org/gitter/webapp/issues/2069


# 19.37.0 - 2019-2-19

 - Fix inline code blocks showing vertical scrollbar in the dark theme
    - Thanks to [@tameo](https://gitlab.com/tameo) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1335

Developer facing:

 - Upgrade from webpack v1 to latest webpack v4, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1322
    - JavaScript chunks/bundles are now dynamically loaded based on webpack build manifest/artifact
 - Try larger timeout for flakey GitHub integration tests
    - https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1334
    - https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1337
 - Remove extraneous `lodash` from frontend webpack bundles (use `underscore`), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1336


# 19.36.0 - 2019-2-15

 - Fix GitLab issue decorations opening in GitHub (404) on mobile, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1321
 - Update `@gitterhq/translations@1.9.0` dependency for Georgian(`ka`) translations
    - Thanks to [@davitperaze](https://gitlab.com/davitperaze) for the contribution, https://gitlab.com/gitlab-org/gitter/gitter-translations/merge_requests/68
 - Remove GitHub `/login/explain` page
     - Thanks to [@prajwalm2212](https://gitlab.com/prajwalm2212) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1330
 - Trim extra space in invite user input field (email)
     - Thanks to [@prajwalm2212](https://gitlab.com/prajwalm2212) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1329
     - https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1333
 - Fix breakpoint for login primary button on homepage so only one shows at a time
     - Thanks to [@gokhanap](https://gitlab.com/gokhanap) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1331
 - Fix inviting many users pushing invitation input offscreen
     - Thanks to [@spiffytech](https://gitlab.com/spiffytech) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1327

Developer facing:

 - Remove defunct in-browser tests, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1326


# 19.35.0 - 2019-1-31

 - Update `@gitterhq/translations@1.8.2` dependency for Chinese(`zh`) translation update
    - Thanks to [@imba-tjd](https://gitlab.com/imba-tjd) for the contribution, https://gitlab.com/gitlab-org/gitter/gitter-translations/merge_requests/66

Developer facing:

 - Add Prettier automatic formatting for simple lint compliance, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1292


# 19.34.0 - 2019-1-25

 - Update `@gitterhq/translations@1.8.1` dependency for Chinese(`zh`) typo fix
    - Thanks to [@nodexy](https://gitlab.com/nodexy) for the contribution, https://gitlab.com/gitlab-org/gitter/gitter-translations/merge_requests/65
 - Fix `/login/upgrade` CSRF by adding dedicated landing page with "Upgrade" button to `POST` upgrade, https://gitlab.com/gitlab-org/gitter/webapp/issues/2061
    - https://gitlab.com/MadLittleMods/webapp/merge_requests/11

Developer facing:

 - Lowercase persisted emails for easier matching, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1316
 - Remove masked email from `/api/private/check-invite` response, https://gitlab.com/gitlab-org/gitter/webapp/issues/2064
    - https://gitlab.com/MadLittleMods/webapp/merge_requests/10


# 19.33.0 - 2019-1-11

 - Fix left-menu minibar scrollbar track visible on Firefox (annoying in dark theme), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1311
 - Add "What's new?" on profile menu linking to changelog
     - Thanks to [@avelino](https://gitlab.com/avelino) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1300

Developer facing:

 - Update base Docker images to use node@10 and npm@5, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1312
 - Remove authorization code after used to exchange for token (OAuth), https://gitlab.com/gitlab-org/gitter/webapp/issues/2054
    - https://gitlab.com/MadLittleMods/webapp/merge_requests/6
    - Thanks to [@cache-money](https://hackerone.com/cache-money) for [responsibly disclosing](https://about.gitlab.com/security/disclosure/) this vulnerability to us.
 - Rotate and move webhook cypher secret to secrets repo, https://gitlab.com/gitlab-org/gitter/webapp/issues/2063
    - https://gitlab.com/MadLittleMods/webapp/merge_requests/7
    - https://gitlab.com/gitlab-org/gitter/gitter-webhooks-handler/merge_requests/27
    - https://gitlab.com/gl-gitter/secrets/merge_requests/17
    - Thanks to [@mishre](https://hackerone.com/mishre) for [responsibly disclosing](https://about.gitlab.com/security/disclosure/) this vulnerability to us.


# 19.32.0 - 2019-1-8

 - Update `@gitterhq/translations@1.7.0` dependency for updated Chinese(`zh`) translations
    - Thanks to [@imba-tjd](https://gitlab.com/imba-tjd) for the contribution, https://gitlab.com/gitlab-org/gitter/gitter-translations/merge_requests/63
 - Update KaTeX dependency to 0.10.0, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1308
    - Thanks to [@edoverflow](https://hackerone.com/edoverflow) for [responsibly disclosing](https://about.gitlab.com/security/disclosure/) this vulnerability to us.


# 19.31.0 - 2019-1-3

 - Fix Korean homepage translation erroring out (500), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1304
 - Add ability to toggle dark theme in mobile app WebFrame (Android)
    - Thanks to [@charafau](https://gitlab.com/charafau) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1232
    - Also see accompanying Android MR, https://gitlab.com/gitlab-org/gitter/gitter-android-app/merge_requests/2

Developer facing:

 - Update Elasticsearch highlight `pre_tag` `<m0>` to have matching closing `post_tag` `</m0>`
    - Thanks to [@AdmiralSnyder](https://gitlab.com/AdmiralSnyder) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1303
 - Fix Elasticsearch and MongoDB Docker image builds, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1305


# 19.30.0 - 2018-12-17

 - Rename the default room when you create a community from `Lobby` -> `community`
    - Thanks to [@gtsiolis](https://gitlab.com/gtsiolis) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1293

Developer facing:

 - Fix Mocha not skipping integration tests that have nested `describe`, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1294
    - Fix test failing because before hook still runs when we should skip, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1297
 - Escape message text from chat message reports, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1295
 - Fix "No query solutions" error caused by not using an existing index and `notablescan: true`, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1298


# 19.29.2 - 2018-12-17

 - Fix XSS in left-menu room display name, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1301
    - Thanks to [@amark](https://gitlab.com/amark) for [responsibly disclosing](https://about.gitlab.com/security/disclosure/) this vulnerability to us.


# 19.29.0 - 2018-12-5

 - Update footer padding on homepage(`/?redirect=no`) and `/apps` to be more consistent/purposeful
    - Thanks to [@gtsiolis](https://gitlab.com/gtsiolis) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1288
 - Increase star contrast and use yellow for favorite rooms in the left menu
    - Thanks to [@avelino](https://gitlab.com/avelino) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1282

Developer facing:

 - Update readme setup instructions to favor `source .env` and adjust some Node.js install language,
    - Thanks to [@gtsiolis](https://gitlab.com/gtsiolis) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1281
 - Update minimum requirement to npm 6.x
    - Thanks to [@gtsiolis](https://gitlab.com/gtsiolis) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1286
 - Remove unused/orphaned dependencies, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1289
 - Re-enable validation CI job (fix eslint errors), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1290


# 19.28.0 - 2018-12-4

 - Update readme badger and service URLs in `hbs` templates to point at GitLab projects (previously GitHub)
    - Thanks to [@avelino](https://gitlab.com/avelino) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1280, https://gitlab.com/gitlab-org/gitter/docs/merge_requests/57
 - Add more frame policies to disable another site `<iframe>` embedding the app (prevent clickjacking), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1284, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1287
    - Thanks to [@harry_mg](https://hackerone.com/harry_mg) for [responsibly disclosing](https://about.gitlab.com/security/disclosure/) this vulnerability to us.

Developer facing:

 - Update `obtain-secrets` script to better align with Twitter's new developer site
    - Thanks to [@gtsiolis](https://gitlab.com/gtsiolis) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1278
 - Remove reference to `gulp` in `obtain-secrets` script (just use `npm start`)
    - Thanks to [@gtsiolis](https://gitlab.com/gtsiolis) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1279
 - Remove collapse embeds chat item server-side endpoints, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1276
 - Fix webhooks on [beta](https://beta.gitter.im/) by pointing it at the new `gitter-beta-01`, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1283


# 19.27.0 - 2018-11-27

 - Fix period/dot in username breaking mention syntax
    - Thanks to [@hho](https://gitlab.com/hho) for the contribution, https://gitlab.com/gitlab-org/gitter/gitter-marked/merge_requests/10
 - Fix quoting multi-line messages. Angle bracket `>` added to each line
    - Thanks to [@auua](https://gitlab.com/auua) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1264
 - Remove embeds (link unfurling/expansion), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1275
    - Embeds were already deprecated and put behind a feature toggle that was defaulted to off, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1223

Developer facing:

 - Fix 404 when trying to delete an [Gitter developer OAuth app](https://developer.gitter.im/apps), https://gitlab.com/gitlab-org/gitter/developer-gitter-im/merge_requests/19


# 19.26.0 - 2018-11-19

 - Add "Sign in" link to 404 page, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1269

Developer Facing:

 - Build mobile Android/iOS assets in CI for artifact usage in downstream Android/iOS builds, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1272


# 19.25.0 - 2018-11-15

 - Update `/apps` footer to match homepage
    - Thanks to [@auua](https://gitlab.com/auua) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1265
 - Add frame policies to disable another site `<iframe>` embedding the app (prevent clickjacking), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1270
    - Thanks to [@harry_mg](https://hackerone.com/harry_mg) for [responsibly disclosing](https://about.gitlab.com/security/disclosure/) this vulnerability to us.

 Developer Facing:

 - Remove outdated legal docs
    - Thanks to [@gtsiolis](https://gitlab.com/gtsiolis) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1266
 - Update readme to link issue discussing streamlining initial OAuth config setup, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1267
 - Use correct GitLab OAuth redirect URI in `obtain-secrets` script, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1268


# 19.24.0 - 2018-11-6

Developer Facing:

 - Remove root-level config cruft, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1249
 - Add trackable hiring/job posting link for in left-menu, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1262


# 19.23.0 - 2018-11-1

 - Add Gitter hiring/job link to left-menu, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1252
 - Add docs about notifications not happening on mobile (Android, iOS), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1254
 - Add docs about how to change room security after creation (public/private), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1256
 - Update `@gitterhq/services@1.23.0` dependency with Heroku fixes to only generate an activity event for a completed Heroku app update event
    - Thanks to [@wlach](https://gitlab.com/wlach) for the contribution, https://gitlab.com/gitlab-org/gitter/services/merge_requests/101

Developer Facing:

 - Link to Gitter spam runbook doc, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1255
    - Thanks to [@rostrander](https://gitlab.com/rostrander) for creating the runbook
 - Remove dead security descriptor updater code, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1259


# 19.22.0 - 2018-10-29

Developer facing:

 - Fix `unreadItemService.removeItem` not working with lean objects causing stuck unreads, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1247
 - Correlate client access stat with segmentable user-agent, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1248


# 19.21.0 - 2018-9-27

 - Update `@gitterhq/services` dependency with Heroku fixes, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1244
    - Thanks to [@wlach](https://gitlab.com/wlach) for the contribution, https://gitlab.com/gitlab-org/gitter/services/merge_requests/98

 Developer facing:

  - Gitter iOS app is now open-source, https://gitlab.com/gitlab-org/gitter/gitter-ios-app
  - Fix `unread-remove-deleted-messages` script so it actually removes stuck unreads, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1245


# 19.20.0 - 2018-9-18

 - Fix null pointer exception -> 500 status error with empty markdown links, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1241
 - Update `jwt-simple` to fix critical npm audit security issue, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1242


# 19.19.0 - 2018-9-10

 - Remove Gitter Topics from the codebase, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1238

Developer facing:

 - Remove orphaned `.js` files, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1239


# 19.18.0 - 2018-9-5

 - Add "Contribute to Gitter" item to profile menu
    - Thanks to [@pdurbin](https://gitlab.com/pdurbin) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1233
 - Update homepage to reflect free without limits for public and private, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1234

 Developer facing:

 - Use Node.js v10 as the default/recommended version
    - https://gitlab.com/gitlab-org/gitter/webapp/commit/4b1264476a8b770a942b05c1a10aecf8ac69f129
    - https://gitlab.com/gl-infra/gitter-infrastructure/merge_requests/57
 - Only initialize notification listener in app frame and add some debug logging, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1235


# 19.17.0 - 2018-8-20

 - Add reporting/flagging of messages, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1226


# 19.16.0 - 2018-8-15

 - Fix terms of service links pointing to Zendesk instead of GitLab, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1227
 - Fix "Gitter from GitLab" footer link styling, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1228
 - Fix links on homepage for Gitter projects (point to GitLab)
    - Thanks to [@MajkelKorczak](https://gitlab.com/MajkelKorczak) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1230

Developer facing:

 - Add message soft-delete (store message in another collection on delete), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1225


# 19.15.0 - 2018-8-8

 - Add feature toggle for embeds and disable by default, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1223

Developer facing:

 - Gitter Android app is now open-source, https://gitlab.com/gitlab-org/gitter/gitter-android-app
    - Move Android embedded chat build to cross-platform Gulp scripts, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1218
    - Separate Android and iOS builds (restore chat input for Android), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1222


# 19.14.0 - 2018-8-1

 - Remove missing 404 rooms from the homepage, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1215
 - Clicking decorated issue will open the link instead of opening the popover, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1217

Developer facing:

 - Fix `new_user` stat not being pushed out and tracked, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1216


# 19.13.0 - 2018-7-27

 - Add GitLab issue decorations, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1077

Developer facing:

 - Update to Mocha@5.x for better debugging, `--inspect` (node inspector devtools), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1212


# 19.12.0 - 2018-7-23

 - Update `@gitterhq/services@1.21.0` (integrations), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1078
    - Adds Discourse integration
    - Adds The Bug Genie integration

Developer facing:

 - `/v1/repo-info?repo=foo%bar` now returns a `204` status code(previously 200) when the given `repo` query parameter can't be found which caused JSON parsing on the frontend to fail, https://gitlab.com/gitlab-org/gitter/webapp/issues/1948
 - Fix `loading-view.js` NPE when hooking iframe `DOMContentLoaded` event, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1208
 - Stop Elasticsearch `NoConnections` errors being spammed to Sentry, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1209
 - Pass along `additionalData` from `gitter-faye` to Sentry for more context (trying to solve [#1906](https://gitlab.com/gitlab-org/gitter/webapp/issues/1906)), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1210
    - Update to `@gitterhq/env@0.39.0` to pass additional data to Sentry/raven, https://gitlab.com/gitlab-org/gitter/env/merge_requests/16
    - Update to `gitter-faye@1.2.0` to get additional data passed from logger, https://gitlab.com/gitlab-org/gitter/faye/merge_requests/3


# 19.11.0 - 2018-7-18

 - Persist emails for GitHub users when they sign in, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1095
    - Add utility script to find a user by email, `node script/utils/find-users-by-email.js --email foo@bar.com`


# 19.10.1 - 2018-7-16

 - Fix topics export rate-limit applying globally instead of per-user, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1204


# 19.10.0 - 2018-7-16

 - Add ability to export [topics](https://blog.gitter.im/2016/09/30/introducing-gitter-topics/)
    - Update to `@gitterhq/env@0.38.0` to stream error if headers already sent, https://gitlab.com/gitlab-org/gitter/env/merge_requests/15
    - Add utility scripts `scripts/utils/list-group-admins.js` and `scripts/utils/list-admins-of-every-forum.js` to help gather topics/forum admin emails
    - Add utility script `scripts/utils/email-for-user.js` to get an email for a given user


# 19.9.0 - 2018-7-11

 - Add ghost option to account deletion in order to disassociate personal data, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1197
 - Add native QML/Qt app to 3rd party app list, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1200
    - Thanks to [@eklavya](https://gitlab.com/eklavya) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1200


# 19.8.0 - 2018-6-29

 - Restore token revoked logging, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1192

Developer facing:

 - Run integration tests in GitLab CI, https://gitlab.com/gitlab-org/gitter/webapp/issues/1918


# 19.7.0 - 2018-6-27

 - Emoji typeahead (autocomplete) only appears after two characters have been typed to more easily send a simple emoticon `:p`
    - Thanks to [@jonhoo](https://gitlab.com/jonhoo) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1188
 - Ensure you can admin the auto-selected community before populating create room modal, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1117

Developer facing:

 - Update to `gitter-realtime-client@1.7.0` which has an updated Halley (smart WebSocket client) ([more context](https://gitlab.com/gitlab-org/gitter/webapp/issues/1937#solution)), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1190
 - Update Apple push notification (APN) `prod` and `prod-dev` certificates/keys, https://gitlab.com/gl-gitter/secrets/merge_requests/9


# 19.6.0 - 2018-6-18

 - Fix revoked desktop client trying to handshake with realtime/websocket/faye server every 2 seconds (update `interval` from 2 seconds to 10 days), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1186


# 19.5.0 - 2018-6-16

 - Fix delete account profile menu action not working on explore page, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1181
 - Update `@gitterhq/translations` dependency to v1.5.0, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1182

Developer facing:

 - Add `scripts/utils/delete-group.js` util script to delete a group/community, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1166
 - Only subscribe to `/v1/token/xxx` Faye endpoint if signed in, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1183
 - Remove token revoked logging because it is filling up disk space on websocket servers, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1185

# 19.4.0 - 2018-6-11

 - Revoke desktop app v2, v3 to prevent token leaks, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1180
    - Context https://blog.gitter.im/2018/06/11/gitter-token-leak-security-issue-notification/
    - Thanks to Dale Higgs for [responsibly disclosing this vulnerability](https://about.gitlab.com/disclosure/) to us
 - Update `@gitterhq/translations` dependency to v1.4.3, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1079


# 19.3.0 - 2018-6-7

 - Add ability to delete account, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1169
 - Update code syntax highlighting to have better visual contrast,
    - Thanks to [@TallTed](https://gitlab.com/TallTed) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1174
 - Fix "Sign in with GitLab" not working -> "Failed to fetch user profile", https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1177

Developer facing:

 - Technical debt: Move `server/services/room-service.js` to `gitter-web-rooms` module, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1165
    - Also create dependent modules: `gitter-web-unread-items`, `gitter-web-push-notifications`, `gitter-web-users`, `gitter-web-chats`, `gitter-web-events`, `gitter-web-email-addresses`, `gitter-web-user-settings`, `gitter-web-email-notifications`
 - Update utility script docs to be more copy-pasta friendly, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1173
 - Fix `skip` parameter in the room search API endpoint `/v1/rooms?q=foo&skip=15&limit=3`
    - Thanks to [@nsuchy](https://gitlab.com/nsuchy) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1175
 - Add room `lcUri` to room deletion log warning for easier grepping, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1168


# 19.2.0 - 2018-5-23

 - Add "Terms of Service" profile menu item linking to https://about.gitlab.com/terms/, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1161
 - Fix "Allow private repo access" profile menu item not redirecting to GitHub OAuth upgrade flow, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1162

Developer facing:

 - Add developer FAQ, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1163
    - First FAQ is on how to configure Gitter so you can access it over your local network on separate devices
 - Correlate user-agent with OAuth token usage (stats), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1160


# 19.1.0 - 2018-5-21

 - Sign out user when token revoked in realtime, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1155
 - Sign out user when using revoked user-agent, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1157

Developer facing:

 - Update `scripts/utils/auto-remove-from-room.js` to be robust against a room not existing, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1153
 - Add Gitter desktop app v4 OAuth clients (consider internal Gitter client), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1156


## 19.0.2 - 2018-5-9

 - Fix new messages with mentions not appearing in chat list, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1151


## 19.0.1 - 2018-5-9

 - Fix desktop app JavaScript being broken, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1149


## 19.0.0 - 2018-5-9

 - Sign in with GitLab (usernames are suffixed with `_gitlab`), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1076
 - Deploy to beta/production via GitLab CI
     - https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1064, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1081, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1099, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1102, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1125
 - Add `:slight_smile:` 🙂 emoji
    - Thanks to [@porsager](https://gitlab.com/porsager) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1097
 - Disable emoticons like :) turning into emojis
    - Thanks to [@asmeurer](https://gitlab.com/asmeurer) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1115
 - Fix "Raise an Issue" linking to [deprecated GitHub issue repo](https://github.com/gitterHQ/gitter) instead of [GitLab](https://gitlab.com/gitlab-org/gitter/webapp)
    - Thanks to [@dregad](https://gitlab.com/dregad) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1101
 - Add ability to revoke OAuth clients, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1071
    - Avoid redirect loop even with forced token authentication, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1132
 - Fix welcome message error thrown when signing in and auto-joining a room via Sidecar, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1085
 - Fix "Repo Info" tab text-color with the dark theme enabled in the right-sidebar, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1083
 - Update repo conflict room creation validation message to be more actionable, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1118
 - Update to `readme-badger@0.3.0` which adds smarter markdown badge insertion (insert alongside other badges)
    - Thanks to [@chinesedfan](https://gitlab.com/chinesedfan) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1116 (see https://github.com/gitterHQ/readme-badger/pull/44 for the contribution in the `readme-badger` repo)
 - Remove "Your organisations" section from the bottom of the conversation list, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1123
 - Fix null-pointer exception (NPE) issue with the issue decorator in the Safari desktop app, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1134
 - Fix new messages not appearing in chat list, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1146

Developer facing:

 - Add `package-lock.json` for consistent and stable dependencies. Document Node.js v6 and npm v5 requirements, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1103
 - Remove anonymous token password. `tokens__anonymousPassword` is now needed in your `.env` file, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1088
 - Add support for Docker Compose, Docker for Mac, Docker for Windows instead of Docker Toolbox, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1084
 - Initially build CSS fileset when using watch task, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1075
 - Re-enable `unhandledrejection` Sentry logging and fix `undefined` messages, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1131
    - Updated Sentry Raven.js [`raven-js@3.24.2`(https://www.npmjs.com/package/raven-js), https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1130
 - Add docs for running on Windows, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1074
 - Restructure and add docs to help get started touching production, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1107
    - Add more docs about fixing Mongo -> Elasticsearch rivers in production, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1108
    - Add docs on how to use `deploy-tools/service-tree` and moving projects to GitLab, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1121
 - Friendly iOS notification missing config errors in logs, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1072
 - Fix number based usernames(like `000123`) being passed incorrectly to utility scripts CLI argv, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1089
 - Update to `@gitterhq/styleguide@2.0.0` to fix the static server(on port 5001) not starting up in the local dev environment, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1119
 - Add utility script to send fake unread notification email, `scripts/utils/send-unread-notification-email.js`, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1135
 - Update `scripts/utils/rename-group.js` to account for `homeUri`, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1133
    - Rename `scripts/utils/rename-org.js` -> `scripts/utils/rename-group.js` to better represent our current naming for communties internally
 - Update to `bluebird@3.5.1`, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1139
 - Update to `@gitterhq/env@0.36.0` to fix Sentry sending errors, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1148
