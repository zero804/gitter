

import '../less/index.less';

import Backbone from 'backbone';
import React from 'react';
import reactDOM from 'react-dom';
import app from './app.jsx';
import router from './routers/index';

const App = React.createFactory(app);
const appRoot = document.getElementById('app-root');

Backbone.history.start({ pushState: true });
reactDOM.render(App({ router: router }), appRoot);
