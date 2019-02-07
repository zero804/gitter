# Gitter webapp

[Gitter](https://gitter.im) is a community for software developers. This project is the main monolith web application.

This codebase even covers a lot of the mobile and desktop applications which embed a web frame.

If you are just interested in the Gitter API, see https://developer.gitter.im/

We also have a roadmap/plan (dates not accurate),

 - [Epics roadmap](https://gitlab.com/groups/gitlab-org/-/roadmap?scope=all&utf8=%E2%9C%93&state=opened&label_name[]=Gitter&layout=QUARTERS)
 - [Epics list](https://gitlab.com/groups/gitlab-org/-/epics?label_name%5B%5D=Gitter&scope=all&sort=start_date_asc&state=opened)

![](https://i.imgur.com/wT0bSy2.png)

## Background

Development of Gitter can be done in any environment that supports Node.js and bash and can run Redis and MongoDB, but for simplicity we use Docker Compose to provide a pre-canned environment which contains:

 1. Mongodb (persistent storage)
 1. Elasticsearch (search)
 1. Redis (caching and some persistent storage)
 1. Neo4j (suggestions)

## Prerequisites

Follow these instructions to setup an environment to hack on Gitter.

 1. [Install Docker Compose](https://docs.docker.com/compose/install/)
    * On Linux, follow the instructions over at  https://docs.docker.com/compose/install/
    * On Mac, use [Docker for Mac](https://docs.docker.com/docker-for-mac/install/)
    * On Windows, get [Docker for Windows](https://docs.docker.com/docker-for-windows/install/)
 1. Install **Node 10.x (LTS)** [manually](https://nodejs.org/dist/latest-v10.x/) or using a tool like [nvm](https://github.com/creationix/nvm)
    * If you are on Windows, you can use [nvm-windows](https://github.com/coreybutler/nvm-windows)
 1. Install **npm 6.x**
    * Node **10.x** already comes with **npm 6.x**. Otherwise, you can install manually with `npm install npm@^6.x -g`
 1. Clone this repo: `git clone https://gitlab.com/gitlab-org/gitter/webapp.git`
 1. Run `npm install`
    * Go and make a cup of tea, because this will take a rather long time.

### Troubleshooting

#### `npm ERR! Maximum call stack size exceeded`

If you are running into `npm ERR! Maximum call stack size exceeded`

```bash
# Remove nested `node_modules` directories
$ find . -name "node_modules" -exec rm -rf '{}' +

# Remove nested `package-lock.json`
$ find . -name "package-lock.json" -exec rm -rf '{}' +

# Try installing again
$ npm install
```

## Starting Gitter

### Start dependent services

Start Gitter's dependent services:

```shell
docker-compose up -d --no-recreate
```

If you run into the following error, you may need to re-run the same command with `sudo`.
```
ERROR: Couldn't connect to Docker daemon at http+docker://localunixsocket - is it running?

If it's at a non-standard location, specify the URL with the DOCKER_HOST environment variable.
```

This process will fetch Docker images from Docker Hub. You might want to make another cup of tea and have a biscuit at this point. You can also continue to the next section at this point to kill some time.

### Configure service secrets

Gitter connects to third party APIs. In order to do this, you will need to generate API tokens and add them to your configuration.

You only need to collect the secrets once. But you need to export the environment variables in any new terminal session.

In the future, we hope to streamline this process and skip OAuth providers. You can track https://gitlab.com/gitlab-org/gitter/webapp/issues/1973

#### Mac

To do this automatically, run the following command which will create a `.env` file (this only needs to be done once):
```shell
./obtain-secrets
```

Export the environment variables with (this needs to be done in any new terminal session):

```bash
source .env
```

#### Windows

The `./obtain-secrets` script doesn't support Windows yet.

Create `.env` in the project root and follow the `REM` comments in the snippet below (this only needs to be done once):

`.env`
```
SET web__sessionSecret=xxx
SET ws__superClientPassword=xxx
SET web__messageSecret=xxx
SET email__unsubscribeNotificationsSecret=xxx
SET integrations__secret=xxx
SET github__statePassphrase=xxx
REM Visit https://developer.twitter.com/en/apps/create, name: Gitter Twitter YOURTWITTERUSERNAME, callback url: http://localhost:5000/login/twitter/callback
REM After creation, click "keys and tokens" to get your Consumer API Keys
SET twitteroauth__consumer_key=xxx
SET twitteroauth__consumer_secret=xxx
REM Visit https://gitlab.com/profile/applications, name: Gitter User Dev, redirect URI: http://localhost:5000/login/gitlab/callback, scopes: api, read_user
SET gitlaboauth__client_id=xxx
SET gitlaboauth__client_secret=xxx
REM Visit https://github.com/settings/applications/new, name: Gitter Private Dev, authorization callback url: http://localhost:5000/login/callback
SET github__client_id=xxx
SET github__client_secret=xxx
REM Visit https://github.com/settings/applications/new, name: Gitter User Dev, authorization callback url: http://localhost:5000/login/callback
SET github__user_client_id=xxx
SET github__user_client_secret=xxx
REM Same as github__user_client_id
SET github__anonymous_app__client_id=xxx
REM Same as github__user_client_secret
SET github__anonymous_app__client_secret=xxx
REM This can be some random string
SET tokens__anonymousPassword=xxx
```

Export the environment variables with (this needs to be done in any new terminal session):

```powershell
@FOR /f "tokens=*" %i IN ('cat .env') DO @%i
```

### Start Gitter services

Only proceed once [dependent services](#start-dependent-services) (Docker containers) have started.

Gitter is executed through Gulp with the following command:

```shell
npm start
```

Visit [http://localhost:5000](http://localhost:5000)

#### Inspecting the Node.js instance

You can inspect the Node.js instance with Chrome devtools by adding the `--inspect-node` flag.
This allows you to use things like breakpoints, `debugger`, and step through the code.

```sh
npm start -- --inspect-node
```

You can also install the [Node.js inspector Manager (NiM)](https://chrome.google.com/webstore/detail/gnhhdgbaldcilmgcpfddgdbkhjohddkj)
browser extension to automatically keep your devtools up to date when
Nodemon restarts the Node.js process.

### Shutting down Docker Compose

You can stop the docker containers with:

```shell
docker-compose stop
```

If you want to remove your containers, use

```shell
docker-compose rm -f
```

### Going further

We also have some other docs which give a [overview/walkthrough of the codebase](https://gitlab.com/gitlab-org/gitter/webapp/blob/develop/docs/code-overview.md)
and [some notes on touching production](https://gitlab.com/gl-infra/gitter-infrastructure/blob/master/README.md).


### Submitting a merge request

#### Getting the GitLab CI tests green :white\_check\_mark:

Just add all of the variables from your `.env` file to your forked projects **Settings** -> **CI/CD** -> **Environment variables** section

After adding the variables, just retry the pipeline.

You can look at the [issues labeled with ~"test"](https://gitlab.com/gitlab-org/gitter/webapp/issues?scope=all&utf8=%E2%9C%93&state=opened&label_name[]=test) for any known problems.


### Testing

All unit tests etc can be run with `npm test`

#### Browser testing

Running browser unit tests during development requires this command:

```
npm run browser-watch-test
```

Then open your favourite browser and view `http://localhost:9191/fixtures`. This page will live reload with you test changes when required.

To perform an automated test run use the following command:

```
npm run browser-test
```

This will run all tests in [devtool](https://www.npmjs.com/package/devtool).

# Contributing

We use [git-flow](https://danielkummer.github.io/git-flow-cheatsheet/). Merge requests should be made against `develop` not `master`.

Please join us in [gitterHQ/contributing](https://gitter.im/gitterHQ/contributing) for questions or to get in touch.
