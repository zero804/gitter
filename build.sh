#/bin/sh
OLDTAG=`cat /var/log/troupe/cdn-version`
NEWTAG=`git log -n 1 --pretty=format:%h`

mkdir -p public/bootstrap/css/
./node_modules/less/bin/lessc -x public/bootstrap/less/troupe.less  > public/bootstrap/css/troupe.css 
./node_modules/less/bin/lessc -x public/bootstrap/less/trp.less  > public/bootstrap/css/trp.css 
./node_modules/less/bin/lessc -x public/bootstrap/less/trp2.less  > public/bootstrap/css/trp2.css 