'use strict';

const testRequire = require('../test-require');
const mockito = require('jsmockito').JsMockito;
const underlyingEnv = require('gitter-web-env');
const loggerMock = mockito.spy(underlyingEnv.logger);
const { createOptionsValidator } = testRequire.withProxies('./utils/options-validator', {
  'gitter-web-env': { logger: loggerMock }
});

describe('option-validator', function() {
  it('finds unexpected options and logs warning', () => {
    const validator = createOptionsValidator('validator-name', ['a', 'b', 'd', 'x']);
    // stub the real warn so we don't see it in test output
    mockito
      .when(loggerMock)
      .warn()
      .then(() => undefined);
    validator({ a: 1, b: 2, c: 3, d: 4, e: 5 });
    mockito.verify(loggerMock).warn('unexpected options - validator-name - {"c":3,"e":5}');
  });
});
