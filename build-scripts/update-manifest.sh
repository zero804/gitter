#!/bin/bash

date=`date`
cp public-processed/mobile-deployed.appcache public-processed/mobile.appcache
echo "# generated $date" >> public-processed/mobile.appcache