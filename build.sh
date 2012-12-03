#/bin/bash

npm install --dev

sudo chown troupe:troupe /var/log/troupe/cdn-version
sudo -u troupe sh -c 'git log -n 1 --pretty=format:%h > /var/log/troupe/cdn-version'

./node_modules/.bin/grunt process
