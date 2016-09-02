import clientEnv from 'gitter-client-env';
import {RealtimeClient} from 'gitter-realtime-client';
import _ from 'underscore';

let client;

var accessToken = window.context.accessTokenStore.token;
if(!accessToken) { throw new Error('Client has no access token'); }

function authProvider(callback) {
  var mobile = false;
  var authMessage = _.extend({
    token: accessToken,
    version: clientEnv['version'],
    connType: mobile ? 'mobile' : 'online',
    client: mobile ? 'mobweb' : 'web',
  });
  return callback(authMessage);

}

export function getRealtimeClient(){

  if(!client) {

    var c = clientEnv['websockets'] || {};

    client = new RealtimeClient({
      token: accessToken ,
      fayeUrl: c.fayeUrl,
      authProvider: authProvider,
      fayeOptions: c.options,
    });
  }

  return client;
}
