#!/bin/bash -x

find . -name '*.js'|while read i
do
  echo $i;
  ~/code/opensource/nodefy/bin/nodefy $i > $i.new;
  mv $i.new $i;
done

ack log! -l --js |xargs sed -i .backup -Ee "s#log!(.*)'#utils/log'#"
ack 'require\(.handlebars.\)' -l --js |xargs sed -i .backup -Ee "s#require\(.handlebars.\)#require\('handlebars/runtime'\)#"

find . -name '*.backup' -delete
