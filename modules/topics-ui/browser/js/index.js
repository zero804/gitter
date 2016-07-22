var React = require('react');
var reactDOM = require('react-dom');
var app = require('./app.jsx');
var App = React.createFactory(app);
var appRoot = document.getElementById('app-root');

reactDOM.render(App(), appRoot);
