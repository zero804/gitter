#/bin/sh
OLDTAG=`cat /var/log/troupe/cdn-version`
NEWTAG=`git log -n 1 --pretty=format:%h`

if [ "XX$OLDTAG" != "XX$NEWTAG" ]; then
  if [ "XX$OLDTAG" != "XX$" ]; then
    for i in `s3cmd ls s3://troupe-cdn|awk '{print $2}'|grep -v "$OLDTAG"`; do 
      echo removing $i
      s3cmd rm $i
    done
  fi

  cd public
  s3cmd --config /etc/s3cfg cp --acl-public --recursive s3://troupe-cdn/$OLDTAG/ s3://troupe-cdn/$NEWTAG/
  echo $NEWTAG > /var/log/troupe/cdn-version
  chown troupe:troupe /var/log/troupe/cdn-version
  s3cmd --config /etc/s3cfg sync --delete-removed --acl-public /opt/troupe/app/public/ s3://troupe-cdn/$NEWTAG/ --exclude "*.git*"
  cd ..
fi

