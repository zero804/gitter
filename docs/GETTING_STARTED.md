Prerequisites
-------------
* Node.js v4 (you can use v6 if you want a faster dev environment, but v4 is used in prod)
* NPM v2 (you may need to downgrade your copy that came with node)
* Docker Toolbox (latest version, not Docker for Mac)
* gulp (`npm install -g gulp`)

Getting Started
---------------
1. Start Kitematic.app (from Docker Toolbox) to create the virtual machine that mongo/redis/elastic etc will run in
2. `./start` to install and start correct versions of mongo/redis/elastic and set up local domain name records (e.g mongo can then be reached at gitter-mongo-dev:27017)
3. `npm install` to install node dependencies. You will need to be on our vpn for this to work as we have some private modules hosted on our own servers)
4. `npm run link` to symlink all the modules in the "modules" directory so you don’t have to reinstall them on every change
5. `gulp` to run all the tests, compile static assets etc
6. `node web` and go to http://localhost:5000/x to see the web app running!

If you have any problems with connecting to mongo, redis, elastic etc, then run `./kill-services` and run `./start` again.
