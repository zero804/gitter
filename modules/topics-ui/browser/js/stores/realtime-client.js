import clientEnv from 'gitter-client-env';
import {RealtimeClient} from 'gitter-realtime-client';
import _ from 'underscore';
import {getAccessToken} from './access-token-store';

let client;

function authProvider(callback) {
  const mobile = false;
  const authMessage = _.extend({
    token: getAccessToken(),
    version: clientEnv['version'],
    connType: mobile ? 'mobile' : 'online',
    client: mobile ? 'mobweb' : 'web',
  });
  return callback(authMessage);
}

export function getRealtimeClient(){
  if(!client) {
    const c = clientEnv['websockets'] || {};
    client = new RealtimeClient({
      token: getAccessToken(),
      fayeUrl: c.fayeUrl,
      authProvider: authProvider,
      fayeOptions: c.options,
    });
  }

  return client;
}
