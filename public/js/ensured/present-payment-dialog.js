'use strict';

var log = require('../utils/log');

function presentPaymentDialog(options) {
  require.ensure([
    '../components/stripe/perform'
  ], function(require) {
    var performPayment = require('../components/stripe/perform');
    return performPayment(options)
      .catch(function(e) {
        log.error("Payment failure", e);
      })
      .finally(function() {
        window.location.hash = '';
      })

  });
}

module.exports = presentPaymentDialog;
