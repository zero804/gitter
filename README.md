# Install prerequisites

This documentation is currently only available for Mac, we are working Linux and Windows - pull requests welcome!

## Background

Gitter requires MongoDB, Redis, ElasticSearch and Neo4J. These are all included in the docker compose package, which will be provisioned as part of the setup below.

## Mac

1. Install [Docker Toolbox](https://www.docker.com/products/docker-toolbox)
   * **Please note this is different to Docker for Mac**
   * Due to limitations in Docker for Mac and Docker for Windows, you cannot use these products.
   * You can choose either *Docker Quickstart Terminal* or *Kitematic*
2. Install [Node.js 4](https://nodejs.org/dist/latest-v4.x/)
   * We recommend doing this with **nvm**
   * You can install nvm with `curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.2/install.sh | bash`
   * `nvm install 4/*` will install the latest 4.x version of node
3. Install **npm 5** with `npm install npm@latest -g`
   * If you are unable to run npm 5 for whatever reason, you will need to `npm i -g linklocal` and then run `linklocal` after running `npm install`
3. Clone this repo
4. Run `npm install`
   * Go and make a cup of tea, because this will take a rather long time.
5. Whilst drinking your tea, make sure you have Gulp installed. You can do this with `npm install -g gulp`. You may need to use `sudo` for this.
6. Do an initial compile of the CSS with `npm run task-css` this will be part of the gulp task [in the future](https://gitlab.com/gitlab-org/gitter/webapp/issues/1741).


## Starting Gitter

### Background

Gitter uses hostnames to connect to the dependent Docker-provided services. When starting Gitter, we will prompt you to automatically add these to your hostfile. This requires sudo. If you do not feel comfortable, you will need to do it manually in order for Gitter to work.

Below is an example of what this should look like. If you are happy for us to do this for you, you don't need to do anything here.

```
192.168.99.100 gitter-mongo-dev
192.168.99.100 gitter-redis-dev
192.168.99.100 gitter-neo4j-dev
192.168.99.100 gitter-es-dev
```

You can obtain the address by running `docker-machine ip`

### Start dependent services

Start Gitter's dependent services using `./start`

This process will fetch Docker images from Docker Hub. You might want to make another cup of tea and have a biscuit at this point. You can also continue to the next section at this point to kill some time.

### Configure service secrets

You only need to perform this section once.

Gitter connects to third party APIs. In order to do this, you will need to generate API tokens and add them to your configuration.

To do this automatically, run the following command:
`./obtain-secrets`

Export the environment variables with:
`. .env`

### Start Gitter services

Only proceed once the Docker containers have downloaded and installed.

Gitter is executed through Gulp with the following command:
`gulp watch`

Visit [http://localhost:5000](http://localhost:5000)

### Shutting Docker down

You can stop the docker containers with `./kill-services` or `docker-machine stop`

If this doesn't work, you can also use `docker-machine rm -f default`.

# Contributing

We use GitFlow and MRs should be made against `develop` not `master`.

Please join us in [gitterHQ/contributing](https://gitter.im/gitterHQ/contributing) for questions or to get in touch.
