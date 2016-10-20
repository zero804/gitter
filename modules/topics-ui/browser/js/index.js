import '../less/index.less';

import Backbone from 'backbone';
import React from 'react';
import reactDOM from 'react-dom';
import app from './app.jsx';
import router from './routers/index';
import ForumService from './services/forum-service';
import { getCurrentUserStore } from './stores/current-user-store';
import ravenClientFactory from 'gitter-web-client-error-reporting/lib/raven-client-factory';

// Send events to Raven
var user = getCurrentUserStore().getCurrentUser();
ravenClientFactory({
  username: user && user.username
})

const App = React.createFactory(app);
const appRoot = document.getElementById('app-root');

Backbone.history.start({ pushState: true });
reactDOM.render(App({ router: router }), appRoot);


new ForumService();
