'use strict';

module.exports = function getRoomNameFromTroupeName(name){
  name = (name || '');
  if(name[0] === '/') { name = name.substring(1)}
  return /\//.test(name) ? name.split('/')[0] : name;
};
