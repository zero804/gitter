'use strict';

var GoogleEmailAddressService = require('./google-email-address-service');

module.exports = {
  getEmailAddress: function getEmailAddress(user, preferStoredEmail) {
    return GoogleEmailAddressService(user, preferStoredEmail);
  }
};
