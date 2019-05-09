# FAQ

Frequently asked questions by developers.

## How do I access Gitter over my local network?

#### Update the config

Create `config/config.users-overrides.json` and copy/paste `config/config.dev.json` into your new config.

Adjust all of the `localhost` entries to your local IP in the following sections,

 - `web`
 - `cdn`
 - `webhooks`
 - `ws`
 - `embed`

---

Alternatively to copying the whole `config/config.dev.json` over you can just use the relevant parts,

```json
{
  "web": {
    "homeurl": "/",
    "domain": "192.168.1.135",
    "baseserver": "192.168.1.135",
    "baseport": "5000",
    "basepath": "http://192.168.1.135:5000",
    "apiBasePath": "http://192.168.1.135:5000/api",
    "badgeBaseUrl" : "http://192.168.1.135:4000"
  },
  "cdn": {
    "use": false,
    "hosts": [
      "192.168.1.135:5001"
    ]
  },
  "webhooks": {
    "basepath": "http://192.168.1.135:3001"
  },
  "ws": {
    "fayeUrl": "http://192.168.1.135:5000/bayeux"
  },
  "embed": {
    "basepath": "http://192.168.1.135:8061"
  }
}
```

#### Update the OAuth callbacks

The OAuth callbacks you created initially have a `localhost:5000` redirect URI
which will just 404 on a separate device when you try to sign in.

Recreate your secrets using your local network IP, see https://gitlab.com/gitlab-org/gitter/webapp#configure-service-secrets

Restart the server. You should now be able to access Gitter over your local IP from other devices


## Debug logging

There are various `debug(...)` statements throughout the code that trace various functions.
If you want to see these log lines, follow the steps below:

### Backend

For the backend, set the `DEBUG` environment variable,

To show logs for everything you can use `*` [wildcards](https://www.npmjs.com/package/debug#wildcards) in the filter,
```
DEBUG="*" npm start
```

Other examples,
```
DEBUG="gitter:app:permissions:pre-creation:gh-repo-policy-evaluator" npm start
DEBUG="gitter:app:permissions:pre-creation:*" npm start
DEBUG="gitter:app:permissions:pre-creation*" npm start

DEBUG="gitter:app:push-notification-gateway*, gitter:app:group-creation-service*" npm start
```

To disable, you can set the filter to an empty string,
```
DEBUG="" npm start
```

### Windows

On Windows, the syntax to set an environment variable is a little different,

```
set DEBUG="gitter:app:push-notification-gateway*"&&npm start
```

---

There is also `require('gitter-web-env').logger` which gets logged to file and Kibana(Elasticsearch) in production. These messages are shown in the console/terminal though so you can see them in development.

 - `logger.error(...)`
 - `logger.warn(...)`
 - `logger.info(...)`

```
logging:level=info npm start
```

### Frontend

For the frontend, use `window.localStorage.debug` in the devtools console

To show logs for everything you can use `*` [wildcards](https://www.npmjs.com/package/debug#wildcards) in the filter,
```js
window.localStorage.debug = '*';
```

Other examples,
```js
window.localStorage.debug = 'app:eyeballs:detector';
window.localStorage.debug = 'app:eyeballs:*';
window.localStorage.debug = 'app:eyeballs*';

window.localStorage.debug = 'app:eyeballs:*,app:router-chat*';
```

To disable, you can set the filter to an empty string,
```js
window.localStorage.debug = '';
```


## View `webpack` bundle visualization (webpack report)

Run the webapp with the `WEBPACK_REPORT` environment variable set to generate the HTML report

macOS/Linux:
```
WEBPACK_REPORT=1 npm start
```

Windows:
```
set WEBPACK_REPORT=1&&npm start
```

Open `webpack-report/index.html` in your browser


## Develop a security fix

Based off the [GitLab security fix process](https://gitlab.com/gitlab-org/release/docs/blob/master/general/security/developer.md). This section is aimed at other GitLabbers.

 - Before starting, run `npm run security-harness`. This script will install a Git `pre-push` hook that will prevent
pushing to any remote besides `dev.gitlab.org`, in order to prevent accidental disclosure.
    - You may want to clone a separate `dev.gitlab.org` only repo to better separate things instead of adding another remote
    - Otherwise here are some commands to setup and use the `dev.gitlab.org` remote,
       - `git remote add security-dev git@dev.gitlab.org:gitlab/gitter/webapp.git`
       - `git push security-dev`
 - Security fixes should be made against https://dev.gitlab.org/gitlab/gitter/webapp
 - Once the fix is ready, create a release on `dev.gitlab.org` and deploy to staging/production
 - Backport the same fix to https://gitlab.com/gitlab-org/gitter/webapp
