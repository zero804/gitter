var nconf = require('nconf');

module.exports = {
    configure: function() {
      /* Load configuration parameters */
      var nodeEnv = process.env['NODE_ENV'];
      if(!nodeEnv) {
        nodeEnv = 'dev';
        process.env['NODE_ENV'] = nodeEnv;
      }

      console.log("Using environment: " + nodeEnv);

      nconf.argv()
           .env();
      nconf.add('user', { type: 'file', file: './config/config.' + nodeEnv + '.json'  });
      nconf.add('defaults', { type: 'file', file: './config/config.default.json' });
    }
};