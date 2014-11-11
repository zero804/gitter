#!/bin/bash

find . -name '*.js'|while read i
do
  echo $i;
  ~/code/opensource/nodefy/bin/nodefy $i > $i.new;
  mv $i.new $i;
done
