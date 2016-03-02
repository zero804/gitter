'use strict';

module.exports = function roomNameShortener(name){
  if(!name) return '';
  var formattedName = name;
  if(formattedName[0] === '/') { formattedName = formattedName.substring(1) }
  while(formattedName.length > 19) {
    formattedName = spliceFirstPart(name);
    //Using a RegExp here is actually faster than splitting and testing length
    //JP 10/2/16 http://jsperf.com/testing-for-slashes/2
    if(!/\//.test()){ break }
  }
  return formattedName || name;
};

function spliceFirstPart(name) {
  return name.split('/').slice(1).join('/');
}
