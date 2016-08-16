"use strict";

require('../less/index.less');

const Backbone = require('backbone');
const React = require('react');
const reactDOM = require('react-dom');
const app = require('./app.jsx');
const router = require('./routers/index');

const App = React.createFactory(app);
const appRoot = document.getElementById('app-root');

Backbone.history.start({ pushState: true });
reactDOM.render(App({ router: router }), appRoot);
