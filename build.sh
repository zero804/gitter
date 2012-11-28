#/bin/bash

npm install

rm -r public-processed

# ./node_modules/.bin/r.js -o build.js

cp -r public/ public-processed/

mkdir -p public-processed/bootstrap/css/

# ./node_modules/less/bin/lessc -x public-processed/bootstrap/less/troupe.less  > public-processed/bootstrap/css/troupe.css
# ./node_modules/less/bin/lessc -x public-processed/bootstrap/less/trp.less  > public-processed/bootstrap/css/trp.css
./node_modules/less/bin/lessc -x public-processed/bootstrap/less/trp2.less  > public-processed/bootstrap/css/trp2.css
./node_modules/less/bin/lessc -x public-processed/bootstrap/less/mtrp.less  > public-processed/bootstrap/css/mtrp.css
./node_modules/less/bin/lessc -x public-processed/bootstrap/less/trpHomePage.less  > public-processed/bootstrap/css/trpHomePage.css
./node_modules/less/bin/lessc -x public-processed/bootstrap/less/trpChat.less  > public-processed/bootstrap/css/trpChat.css
./node_modules/less/bin/lessc -x public-processed/bootstrap/less/trpFiles.less  > public-processed/bootstrap/css/trpFiles.css
./node_modules/less/bin/lessc -x public-processed/bootstrap/less/trpMails.less  > public-processed/bootstrap/css/trpMails.css
./node_modules/less/bin/lessc -x public-processed/bootstrap/less/trpPeople.less  > public-processed/bootstrap/css/trpPeople.css
# while IFS= read -r -d $'\0' file; do 
#   echo Uglifying $file
#   ./node_modules/.bin/uglifyjs --overwrite -nc --lift-vars $file 
# done < <(find public-processed -name "*.js" ! -iname "*min* " -print0)

while IFS= read -r -d $'\0' file; do 
  cp -p "$file" "${file}.gztmp"
  gzip --best "$file" 
  mv "${file}.gztmp" "$file" 
done < <(find public-processed -type f ! -iname ".*" ! -iname "*.gz" -print0)
