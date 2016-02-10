'use strict';

module.exports = function roomNameShortener(name){
  if(!name) return '';
  if(name[0] === '/') { name = name.substring(1) }
  while(name.length > 19) {
    name = spliceFirstPart(name);
    //Using a RegExp here is actually faster than splitting and testing length
    //JP 10/2/16 http://jsperf.com/testing-for-slashes/2
    if(!/\//.test(name)){ break }
  }
  return name;
};

function spliceFirstPart(name) {
  return name.split('/').slice(1).join('/');
}
