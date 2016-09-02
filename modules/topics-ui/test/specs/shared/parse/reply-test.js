import {deepEqual} from 'assert';
import parseReply from '../../../../shared/parse/reply';

describe('parseReply', () => {

  it('should provide a sent attribute in the right format', () => {
    const expected = { sent: '2016-08-24T15:17:22.439Z', formattedSentDate: 'Aug 24th' };
    const result = parseReply({ sent: '2016-08-24T15:17:22.439Z' });
    deepEqual(result, expected);
  });

});
