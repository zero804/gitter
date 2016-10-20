import {deepEqual} from 'assert';
import parseReply from '../../../../shared/parse/reply';
import { SUBSCRIPTION_STATE_UNSUBSCRIBED } from '../../../../shared/constants/forum'

describe('parseReply', () => {

  it('should provide a sent attribute in the right format', () => {
    const expected = {
      sent: '2016-08-24T15:17:22.439Z',
      formattedSentDate: 'Aug 24th',
      subscriptionState: SUBSCRIPTION_STATE_UNSUBSCRIBED
    };
    const result = parseReply({ sent: '2016-08-24T15:17:22.439Z' });
    deepEqual(result, expected);
  });

});
