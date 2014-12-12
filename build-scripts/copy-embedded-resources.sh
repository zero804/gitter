#!/bin/bash

while read i; do
  dirname output/embedded/www/${i#output/assets/};
done < "output/embedded-resources.txt" | uniq | while read i; do
  mkdir -p $i
done

for i in `cat output/embedded-resources.txt`; do
  cp $i output/embedded/www/${i#output/assets/};
done
