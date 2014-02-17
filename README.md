Gitter App Server

Copyright Troupe Technology Limited 2012 - 2014
All rights reserved.


Please symlink pre-commit to .git/hooks/pre-commit to enable the pre-commit hooks.

__Getting Started__

1.	`npm install`
2.	`grunt less`
3.	`./mongodb.sh`
4.	`./redis.sh &`
5.	`./scripts/mongo/init-dev-mongo.sh`
6.	`./scripts/upgrade-data.sh`
7.	`nodemon -w public/templates -w server -e js,hbs web.js`

__Run Like Production__
`node web --web:staticContent=public-processed/ --web:minified=true`

__Give Hats To Everyone__
`db.users.update({ }, { $set: { permissions: { createRoom: true } } }, { multi: true } )`
