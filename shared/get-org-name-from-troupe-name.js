'use strict';

module.exports = function getRoomNameFromTroupeName(name) {
  name = (name || '');
  if (name[0] === '/') { name = name.substring(1);}

  //We do have the url /orgs/:orgName/rooms which we have to account for
  if (/^orgs/.test(name)) { return name.split('/')[1]; }

  return /\//.test(name) ? name.split('/')[0] : name;
};
