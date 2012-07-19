#/bin/sh
OLDTAG=`cat /var/log/troupe/cdn-version`
NEWTAG=`git log -n 1 --pretty=format:%h`

cd public
s3cmd --config /etc/s3cfg cp --acl-public --recursive s3://troupe-cdn/$OLDTAG/ s3://troupe-cdn/$NEWTAG/
echo $NEWTAG > /var/log/troupe/cdn-version
s3cmd --config /etc/s3cfg sync --acl-public /opt/troupe/app/public/ s3://troupe-cdn/$NEWTAG/ --exclude "*.git*"
cd ..

mkdir -p public/bootstrap/css/
./node_modules/less/bin/lessc -x public/bootstrap/less/troupe.less  > public/bootstrap/css/troupe.css 
./node_modules/less/bin/lessc -x public/bootstrap/less/trp.less  > public/bootstrap/css/trp.css 
./node_modules/less/bin/lessc -x public/bootstrap/less/trp2.less  > public/bootstrap/css/trp2.css 