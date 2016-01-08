'use strict';

module.exports = function roomNameShortener(name){
  return (name.length > 18) ? name.split('/')[1] : name;
};
