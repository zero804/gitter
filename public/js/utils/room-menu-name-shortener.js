'use strict';

module.exports = function roomNameShortener(name){
  if(!name) return '';
  if(name[0] === '/') { name = name.substring(1) }
  while(name.length > 19) { name = spliceFirstPart(name) }
  return name;
};

function spliceFirstPart(name) {
  return name.split('/').slice(1).join('/');
}
