import { REQUEST_SIGN_IN } from '../../constants/forum.js';
import frameUtils from 'gitter-web-frame-utils';

export default function requestSignIn(source = 'topics') {
  frameUtils.postMessage({
    type: 'route-silent',
    hash: 'login',
    args: [
      `source=${source}&returnTo=CURRENT`
    ]
  });

  return {
    type: REQUEST_SIGN_IN,
    source
  };
}
