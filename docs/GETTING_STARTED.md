Prerequisites
-------------
* While the development environment does work on Windows and Linux, **it's easiest to setup on macOS**.
* Node.js v4 (you can use v6 if you want a faster dev environment, but v4 is used in prod)
* NPM v2 (you may need to downgrade your copy that came with node)
* Docker Toolbox (latest version, not Docker for Mac)
* gulp (`npm install -g gulp`)

Getting Started
---------------
1. `./start` to install and start correct versions of mongo/redis/elastic and set up local domain name records (e.g mongo can then be reached at gitter-mongo-dev:27017)
2. `npm install` to install node dependencies. You will need to be on our vpn for this to work as we have some private modules hosted on our own servers)
3. `npm run link` to symlink all the modules in the "modules" directory so you don’t have to reinstall them on every change
4. `gulp` to run all the tests, compile static assets etc
5. `gulp watch` and go to http://localhost:5000/x to see the web app running!

Troubleshooting
---------------

## NPM Install Hanging
We use our own npm registry on `http://beta-internal.beta.gitter:4873`. In order to access this registry, you need to 

1. Be connected to the Gitter VPN.
2. Be able to resolve `beta-internal.beta.gitter` (try `ping beta-internal.beta.gitter`).
3. On some folks systems', the VPN does not correctly configure DNS, but you can add these entries to your hosts file as a workaround:

```
10.0.0.140 beta-internal
10.0.0.140 beta-internal.beta.gitter
```

## Docker-Machine Problems
If you're unable to connect to the docker-machine, it may be worth reinitialising your docker environment. Use the `./kill-services` script to kill your local docker environment, followed by `./start` to restart your environment. Note that doing this will delete all your local data.
