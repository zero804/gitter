'use strict';

const assert = require('assert');
const checkIfDatesSame = require('../lib/check-if-dates-same');

describe('check-if-dates-same', () => {
  [
    {
      name: 'same date strings',
      date1: '2020-11-26T05:51:29.751Z',
      date2: '2020-11-26T05:51:29.751Z',
      expectedResult: true
    },
    {
      name: 'same date but different date types',
      date1: '2020-11-26T06:21:52.998Z',
      date2: new Date('2020-11-26T06:21:52.998Z'),
      expectedResult: true
    },
    {
      name: 'different dates',
      date1: '2020-11-26T06:21:52.998Z',
      date2: '2020-11-26T05:51:29.751Z',
      expectedResult: false
    },
    {
      name: 'one date null',
      date1: '2020-11-26T06:21:52.998Z',
      date2: null,
      expectedResult: false
    },
    {
      name: 'one date undefined',
      date1: undefined,
      date2: '2020-11-26T06:21:52.998Z',
      expectedResult: false
    },
    {
      name: 'dates are same if both null',
      date1: null,
      date2: null,
      expectedResult: true
    },
    {
      name: 'dates are same if both undefined',
      date1: undefined,
      date2: undefined,
      expectedResult: true
    },
    {
      name: 'dates are same if both are null or undefined',
      date1: null,
      date2: undefined,
      expectedResult: true
    }
  ].forEach(meta => {
    it(meta.name, () => {
      assert.strictEqual(checkIfDatesSame(meta.date1, meta.date2), meta.expectedResult);
    });
  });
});
