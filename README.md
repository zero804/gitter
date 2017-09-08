# Install prerequisites

## Background

Development of Gitter can be done in any environment that supports nodejs and bash and can run Redis and MongoDB, but for simplicity
we use Docker Compose to provide a pre-canned environment which contains:

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
1. Do an initial compile of the CSS with `npm run task-css` this will be part of the gulp task [in the future](https://gitlab.com/gitlab-org/gitter/webapp/issues/1741).


## Starting Gitter

### Start dependent services

Start Gitter's dependent services:

```shell
docker-compose up -d
```

This process will fetch Docker images from Docker Hub. You might want to make another cup of tea and have a biscuit at this point. You can also continue to the next section at this point to kill some time.

### Configure service secrets

You only need to perform this section once.

Gitter connects to third party APIs. In order to do this, you will need to generate API tokens and add them to your configuration.

To do this automatically, run the following command:
```shell
./obtain-secrets
```

Export the environment variables with:

```shell
. .env
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
