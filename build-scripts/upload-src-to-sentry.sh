#!/bin/bash

VERSION=10
KEY='aebf9f2f19ab4cf6a603c264bdd006b0'
ORG='cutandpaste'
PROJECT='test1'
BASE_URL='http://example.com/'

printf "\n Creating a Sentry release \n";
curl https://app.getsentry.com/api/0/projects/$ORG/$PROJECT/releases/ \
  -u $KEY: \
  -X POST \
  -d "{\"version\": \"$VERSION\"}" \
  -H 'Content-Type: application/json'

for f in $(ls output/assets/js); do
  printf "\n  Uploading ${f}  \n"
  curl https://app.getsentry.com/api/0/projects/$ORG/$PROJECT/releases/$VERSION/files/ \
    -u $KEY: \
    -X POST \
    -F file=@output/assets/js/$f \
    -F name="${BASE_URL}${f}"
done
