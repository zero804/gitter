#!/bin/sh

mkdir -p data

rm data/*

curl http://download.geonames.org/export/dump/cities15000.zip > data/cities15000.zip
unzip data/cities15000.zip -d data

curl http://download.geonames.org/export/dump/countryInfo.txt > data/countryInfo.txt

curl http://download.geonames.org/export/dump/admin1CodesASCII.txt > data/admin1CodesASCII.txt
