#!/bin/bash

set -e

for i in $(find public -name '*.hbs'); do
  echo $i 
  dest=$(echo $i|sed -e 's/^public/public-processed/'); 
  mkdir -p $(dirname $dest); 
  cp $i $dest;
done
