# Install prerequisites

## Background

Development of Gitter can be done in any environment that supports Node.js and bash
and can run Redis and MongoDB, but for simplicity we use Docker Compose
to provide a pre-canned environment which contains:

 1. Redis
 1. Mongodb
 1. Elasticsearch
 1. Neo4j


## Setup

Follow these instructions to setup an environment to hack on Gitter.

 1. [Install Docker Compose](https://docs.docker.com/compose/install/)
    * On Linux, follow the instructions over at  https://docs.docker.com/compose/install/
    * On Mac, use [Docker for Mac](https://docs.docker.com/docker-for-mac/install/)
    * On Windows, get [Docker for Windows](https://docs.docker.com/docker-for-windows/install/)
 1. Install [Node.js 4](https://nodejs.org/dist/latest-v4.x/)
    * We recommend doing this with **nvm**
    * You can install nvm with `curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.2/install.sh | bash`
    * `nvm install 4/*` will install the latest 4.x version of node
 1. Install **npm 5** with `npm install npm@latest -g`
    * If you are unable to run npm 5 for whatever reason, you will need to `npm i -g linklocal` and then run `linklocal` after running `npm install`
 1. Clone this repo: `git clone https://gitlab.com/gitlab-org/gitter/webapp.git`
 1. Run `npm install`
    * Go and make a cup of tea, because this will take a rather long time.


## Starting Gitter

### Start dependent services

Start Gitter's dependent services:

```shell
docker-compose up -d
```

If you run into the following error, you may need to re-run the same command with `sudo`.
```
ERROR: Couldn't connect to Docker daemon at http+docker://localunixsocket - is it running?

If it's at a non-standard location, specify the URL with the DOCKER_HOST environment variable.
```

This process will fetch Docker images from Docker Hub. You might want to make another cup of tea and have a biscuit at this point. You can also continue to the next section at this point to kill some time.


### Configure service secrets

You only need to perform this section once.

Gitter connects to third party APIs. In order to do this, you will need to generate API tokens and add them to your configuration.

#### Mac

To do this automatically, run the following command which will create a `.env` file:
```shell
./obtain-secrets
```

Export the environment variables with:

```
. .env
# or
source .env
```


#### Windows

The `./obtain-secrets` script doesn't support Windows yet.

Create `.env` in the project root and follow the `REM` comments in the snippet below.

`.env`
```
SET web__sessionSecret=xxx
SET ws__superClientPassword=xxx
SET web__messageSecret=xxx
SET email__unsubscribeNotificationsSecret=xxx
SET integrations__secret=xxx
SET github__statePassphrase=xxx
REM Visit https://apps.twitter.com/app/new, name: Gitter Twitter YOURTWITTERUSERNAME, callback url: http://localhost:5000/login/twitter/callback
REM After creation, click "manage keys and access tokens" to get they key/secret
SET twitteroauth__consumer_key=xxx
SET twitteroauth__consumer_secret=xxx
REM Visit https://gitlab.com/profile/applications, name: Gitter User Dev, authorization callback url: http://localhost:5000/login/gitlab/callback
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
```

Export the environment variables with:

```powershell
@FOR /f "tokens=*" %i IN ('cat .env') DO @%i
```

### Start Gitter services

Only proceed once the Docker containers have downloaded and installed.

Gitter is executed through Gulp with the following command:

```shell
npm start
```

Visit [http://localhost:5000](http://localhost:5000)

### Shutting Docker down

You can stop the docker containers with:

```shell
docker-compose stop
```

If you want to remove your containers, use

```shell
docker-compose rm -f
```

# Contributing

We use GitFlow and MRs should be made against `develop` not `master`.

Please join us in [gitterHQ/contributing](https://gitter.im/gitterHQ/contributing) for questions or to get in touch.
