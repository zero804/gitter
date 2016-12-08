'use strict';

var $script = require('scriptjs');
var Promise = require('bluebird');
var _ = require('underscore');
var apiClient = require('../api-client');
var clientEnv = require('gitter-client-env');
var cdn = require('gitter-web-cdn');

function getEmail() {
  return apiClient.priv.get('/email');
}

var CheckoutLoader = new Promise(function(resolve, reject) {
  $script('https://checkout.stripe.com/checkout.js', function() {
    var StripeCheckout = window.StripeCheckout;
    if (!StripeCheckout) return reject(new Error('StripeCheckout load error'))
    resolve(StripeCheckout);
  });
});


function CheckoutHandler() {
  this.configComplete = CheckoutLoader
    .then(function(StripeCheckout) {
      return StripeCheckout.configure({
        key: clientEnv.stripeKey,
      });
    });
}

CheckoutHandler.prototype.obtainToken = function(options) {
  var self = this;
  return Promise.join(self.configComplete,
    getEmail(),
    function(handler, emailAddress) {
      return new Promise(function(resolve, reject) {
        self.onCancel = function() {
          reject(new Error('cancelled'));
          handler.close();
        };

        handler.open(_.extend({
          name: 'Gitter Supporter',
          description: 'Keep Gitter Going',
          image: cdn('images/icon-logo-red-128.png'),
          locale: 'auto',
          email: emailAddress && emailAddress.email,
          bitcoin: true,
          alipay: true,
          alipayReusable: true,
          zipCode: true,
          allowRememberMe: false,
          currency: 'USD',
        }, options, {
          token: function(token) {
            resolve(token);
          },
          closed: function() {
            reject(new Error('closed'))
          }
        }));
      });
  })
  .finally(function() {
    self.onCancel = null;
  });
}

CheckoutHandler.prototype.close = function() {
  if (this.onCancel) {
    this.onCancel();
  }
}

module.exports = CheckoutHandler;
