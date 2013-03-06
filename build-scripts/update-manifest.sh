#!/bin/bash

id=`git rev-list HEAD --max-count=1`
cp public-processed/mobile-deployed.appcache public-processed/mobile.appcache
echo "# generated from $id" >> public-processed/mobile.appcache