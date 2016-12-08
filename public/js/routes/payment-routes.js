'use strict';

var presentPaymentDialog = require('../ensured/present-payment-dialog');

function createRouter() {

  return {
    'pay/:type/:amount': function(type, amount) {
      var amountCents = parseInt(amount, 10) * 100;
      return presentPaymentDialog({
        recurring: type === 'recurring',
        amount: amountCents
      });
    }
  }
}

module.exports = createRouter;
