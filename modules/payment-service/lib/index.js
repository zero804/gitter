'use strict';


var env = require('gitter-web-env');
var logger = env.logger;

var Promise = require('bluebird');
var stripeClient = require('./stripe-client');
var stripeCustomerService = require('./stripe-customer-service');
var debug = require('debug')('gitter:app:payment-service:index');

var planMappings = {
  200: 'supporter_personal_2',
  500: 'supporter_personal_5',
};

function createSubscription(user, customer, token, amount) {
  var userId = user.id || user._id;

  var plan = planMappings[amount];

  logger.info('New subscription', {
    userId: userId,
    plan: plan
  });

  var subscriptionDetails = {
    customer: customer.id,
    plan: plan,
    source: token.id,
    metadata: {
      userId: userId,
      username: user.username
    }
  };

  // Create the subscription in Stripe
  return Promise.resolve(stripeClient.subscriptions.create(subscriptionDetails));
}

function createOnceOffPayment(user, token, amount) {
  debug('Creating once-off charge in Stripe')
  return Promise.resolve(stripeClient.charges.create({
    amount: amount,
    currency: "usd",
    source: token.id,
    description: "Thank you for supporting Gitter",
    metadata: {
      supporter: true,
    }
  }));
}

function createPayment(user, token, amount, recurring) {
  if (!recurring) {
    return createOnceOffPayment(user, token, amount);
  }

  return stripeCustomerService.findOrCreateCustomer(user, token)
    .then(function(customer) {
      return createSubscription(user, customer, token, amount);
    });

}

module.exports = {
  createPayment: Promise.method(createPayment)
}
