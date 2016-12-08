"use strict";

var paymentService = require('gitter-web-payment-service');

module.exports = function(req, res, next) {
  var user = req.user;
  var body = req.body;
  var token = body.token;
  var amount = body.amount;
  var recurring = body.recurring;

  return paymentService.createPayment(user, token, amount, recurring)
    .then(function() {
      res.sendStatus(204);
    })
    // .catch(function(err) {
    //   console.log(err.stack);
    //   throw err;
    // })
    .catch(next);
};
