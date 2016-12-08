'use strict';

var CheckoutHandler = require('./checkout-handler');
var apiClient = require('../api-client');

function perform(options) {
  var recurring = options.recurring;
  var amount = options.amount;

  var checkoutHandler = new CheckoutHandler();
  return checkoutHandler.obtainToken({
      name: 'Save Gitter',
      description: recurring ? 'Monthly Subscription' : 'Once-off Payment',
      amount: amount
    })
    .then(function(token) {
      return apiClient.priv.post('/pay', { token: token, amount: amount, recurring: recurring });
    });
}

module.exports = perform;
