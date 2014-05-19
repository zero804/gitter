Gitter Webapp
=============

Copyright Troupe Technology Limited 2012 - 2014
All rights reserved.

Please symlink pre-commit to .git/hooks/pre-commit to enable the pre-commit hooks.

Getting Started
---------------
1.	`npm install`
2.	`grunt less`
3.	`./mongodb.sh`
4.	`./redis.sh &`
5.	`./scripts/mongo/init-dev-mongo.sh`
6.	`./scripts/upgrade-data.sh`
7.	`nodemon -w public/templates -w server -e js,hbs web.js`

Run Like Production
-------------------
`node web --web:staticContent=public-processed/ --web:minified=true`
