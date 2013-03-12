#!/bin/bash

mkdir -p data

rm data/*

curl http://download.geonames.org/export/dump/cities15000.zip > data/cities15000.zip
curl http://download.geonames.org/export/dump/GB.zip > data/GB.zip
curl http://download.geonames.org/export/dump/ZA.zip > data/ZA.zip
unzip data/cities15000.zip -d data
unzip data/GB.zip -d data
unzip data/ZA.zip -d data

cat data/GB.txt data/ZA.txt data/cities15000.txt > data/allcities.txt

curl http://download.geonames.org/export/dump/countryInfo.txt > data/countryInfo.txt

curl http://download.geonames.org/export/dump/admin1CodesASCII.txt > data/admin1CodesASCII.txt
