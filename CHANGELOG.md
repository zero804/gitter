## 19.0.0

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
 - Fix welcome message error thrown when signing in and auto-joining a room via Sidecar, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1085
 - Fix "Repo Info" tab text-color with the dark theme enabled in the right-sidebar, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1083
 - Update repo conflict room creation validation message to be more actionable, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1118
 - Update to `readme-badger@0.3.0` which adds smarter markdown badge insertion (insert alongside other badges)
    - Thanks to [@chinesedfan](https://gitlab.com/chinesedfan) for the contribution, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1116 (see https://github.com/gitterHQ/readme-badger/pull/44 for the contribution in the `readme-badger` repo)
 - Remove "Your organisations" section from the bottom of the conversation list, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1123
 - Fix null-pointer exception (NPE) issue with the issue decorator in the Safari desktop app, https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1134

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
