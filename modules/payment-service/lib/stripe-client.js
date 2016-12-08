"use strict";

var env = require('gitter-web-env');
var config = env.config;

var Stripe = require('stripe');
var stripe = new Stripe(config.get('stripe:apiKey'));
var https = require('https');

var stripeAgent = new https.Agent();
stripeAgent.maxSockets = 30;
stripe.setHttpAgent(stripeAgent);

module.exports = stripe;
