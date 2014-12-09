#!/bin/bash

while read i; do
  dirname output/embedded/${i#output/assets/};
done < "output/embedded-resources.txt" | uniq | while read i; do
  mkdir -p $i
done

for i in `cat output/embedded-resources.txt`; do
  cp $i output/embedded/${i#output/assets/};
done
