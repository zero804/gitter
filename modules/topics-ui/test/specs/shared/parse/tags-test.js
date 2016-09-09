import {deepEqual} from 'assert';
import parseTag from '../../../../shared/parse/tag';

describe('parseTag', () => {

  it('should parse a tag string', () => {
    const expected = { label: 'This is a tag', value: 'this-is-a-tag' };
    const result = parseTag('This is a tag');
    deepEqual(result, expected);
  });

});
