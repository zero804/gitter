'use strict';

var Promise = require('bluebird');
var stripeClient = require('./stripe-client');
var User = require('gitter-web-persistence').User;

/**
 * Returns the promise of a customer
 */
function retrieveStripeCustomer(customerId) {
  return Promise.resolve(stripeClient.customers.retrieve(customerId))
    .then(function(customer) {
      // Don't return deleted customers...
      if(customer && customer.deleted) {
        return null;
      }

      return customer;
    });
}

function findOrCreateCustomer(user, token) {
  var userId = user.id || String(user._id);
  var displayName = user.displayName || user.username;
  var username = user.username;

  return Promise.try(function() {
      if (!user.stripeCustomerId) {
        return null;
      }

      return retrieveStripeCustomer(user.stripeCustomerId);
    })
    .then(function(customer) {
      if(customer) return customer;

      return Promise.resolve(stripeClient.customers.create({
          description: displayName,
          email: token.email,
          metadata: {
            supporter: true,
            gitterId: userId,
            name: displayName,
            username: username
          },
        }))
        .tap(function(customer) {
          user.stripeCustomerId = customer.id;
          return User.findOneAndUpdate({ _id: user._id }, {
            $set: {
              stripeCustomerId: user.stripeCustomerId
            }
          });
        });
    });
}

module.exports = {
  findOrCreateCustomer: Promise.method(findOrCreateCustomer)
}
