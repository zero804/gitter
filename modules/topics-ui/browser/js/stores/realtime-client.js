import clientEnv from 'gitter-client-env';
import {RealtimeClient} from 'gitter-realtime-client';
import _ from 'underscore';
import {getAccessToken} from './access-token-store';

let client;

const serverTokenStore = (window.context.accessTokenStore || {});
const accessToken = (serverTokenStore.token || '');

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
  if(!accessToken.length) { return; }
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
