'use strict';

function validateRoomSecurity(type, security) {
  if (security === 'PUBLIC' || security === 'PRIVATE') {
    return true;
  } else if (type && security == 'INHERITED') {
    return true;
  }
  return false;
}

module.exports = validateRoomSecurity;
