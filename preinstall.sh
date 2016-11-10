#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

find_file_deps() {
  node -e '''
  var pkg = require("./package.json");
  function dep(d) {
    return Object.keys(d).filter(function(key) {
      var spec = d[key];
      return spec.indexOf("file:") === 0
    });
  }
  var fileDeps = dep(pkg.dependencies).concat(dep(pkg.devDependencies));
  fileDeps.forEach(function(f) {
    console.log(f);
  })
'''
}

find_deps() {
  linklocal list --format '%S' --no-summary || find_file_deps;
}

count=0
find_deps|while read line; do
  if [[ -d \"$line\" ]] && [[ ! -h \"$line\" ]]; then
    let "count++"
    rm -r \"$line\";
  fi;
done

if [[ "$count" -gt 0 ]]; then
  echo "Preinstall removed $count modules "
fi
