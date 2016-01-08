'use strict';

module.exports = function roomNameShortener(name){
  if(!name) return '';
  return (name.length > 19) ? name.split('/')[1] : name;
};
