'use strict';


var env = require('gitter-web-env');
var logger = env.logger;

var Promise = require('bluebird');
var stripeClient = require('./stripe-client');
var stripeCustomerService = require('./stripe-customer-service');
var debug = require('debug')('gitter:app:payment-service:index');
var User = require('gitter-web-persistence').User;
var appEvents = require('gitter-web-appevents');

var planMappings = {
  200: 'supporter_personal_2',
  500: 'supporter_personal_5',
  1000: 'supporter_personal_10',
  2500: 'supporter_personal_25',
  5000: 'supporter_personal_50',
  10000: 'supporter_personal_100',
  25000: 'supporter_personal_250',
  50000: 'supporter_personal_500',
  100000: 'supporter_personal_1000',
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
      supporter: true,
      userId: userId,
      username: user.username
    }
  };

  // Create the subscription in Stripe
  return Promise.resolve(stripeClient.subscriptions.create(subscriptionDetails));
}

function createOnceOffPayment(user, token, amount) {
  debug('Creating once-off charge in Stripe');

  return Promise.resolve(stripeClient.charges.create({
    amount: amount,
    currency: "usd",
    source: token.id,
    description: "Thank you for supporting Gitter",
    metadata: {
      supporter: true,
      username: user.username,
      userId: user.id
    }
  }));
}

function createPayment(user, token, amount, recurring) {
  return Promise.try(function() {
    if (!recurring) {
      return createOnceOffPayment(user, token, amount);
    }

    return stripeCustomerService.findOrCreateCustomer(user, token)
      .then(function(customer) {
        return createSubscription(user, customer, token, amount);
      });
  })
  .tap(function() {
    // Update the user
    appEvents.dataChange2("/user/" + user._id, 'patch', {
      id: "" + user._id,
      supporter: true
    }, 'user');

    return User.findOneAndUpdate({ _id: user._id }, {
      $max: {
        supportedDate: new Date()
      }
    });
  })

}

module.exports = {
  createPayment: Promise.method(createPayment)
}
