'use strict';

module.exports = function getRoomNameFromTroupeName(name){
  return /\//.test(name) ? name.split('/')[0] : name;
};
