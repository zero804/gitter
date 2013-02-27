var kue = require('./server/utils/kue');

/* Dodgy hack to restore the original kue (and skip shutdown handlers etc) */
kue.createQueue = kue._originalCreateQueue;
kue.app.listen(3000);
