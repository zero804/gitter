'use strict';


var env = require('gitter-web-env');
var logger = env.logger;

var Promise = require('bluebird');
var stripeClient = require('./stripe-client');
var stripeCustomerService = require('./stripe-customer-service');

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
  return Promise.resolve(stripeClient.subscriptions.create(subscriptionDetails))
    // .tap(function(stripeSubscription) {
    //   console.log(stripeSubscription);
    // });

}

function createOnceOffPayment(user, customer, token, amount) {
  return Promise.resolve(stripeClient.charges.create({
    amount: amount,
    currency: "usd",
    source: token.id,
    description: "Thanks for your supporter."
  }));
}

function createPayment(user, token, amount, recurring) {
  return stripeCustomerService.findOrCreateCustomer(user, token)
    .then(function(customer) {
      if (recurring) {
        return createSubscription(user, customer, token, amount);
      } else {
        return createOnceOffPayment(user, customer, token, amount);
      }
    });

}

module.exports = {
  createPayment: Promise.method(createPayment)
}
