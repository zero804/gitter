'use strict';

var presentPaymentDialog = require('../ensured/present-payment-dialog');

function createRouter() {

  return {
    'pay': function() {
      return presentPaymentDialog({
        /* options here */
      });
    }
  }
}

module.exports = createRouter;
