import assert from 'assert';
import accessTokenStore from '../../../../server/stores/access-token-store';

describe('accessTokenStore', () => {

  var data = {};

  it('should an object with getAccessToken', () => {
    assert(accessTokenStore(data).get);
  });

});
