'use strict';

module.exports = function roomNameShortener(name){
  if(!name) return '';
  if(name[0] === '/') { name = name.substring(1) }
  return (name.length > 19) ? name.split('/')[1] : name;
};
