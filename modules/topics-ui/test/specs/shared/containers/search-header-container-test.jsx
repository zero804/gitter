import { equal, deepEqual } from 'assert';
import React from 'react';
import sinon, {spy} from 'sinon';
import { shallow } from 'enzyme';
import SearchHeaderContainer from '../../../../shared/containers/components/search/SearchHeaderContainer.jsx';
import { subscribe } from '../../../../shared/dispatcher';

import { REQUEST_UPDATE_FORUM_SUBSCRIPTION_STATE, SUBSCRIPTION_STATE_UNSUBSCRIBED } from '../../../../shared/constants/forum';

describe('<SearchHeaderContainer />', function(){

  let wrapper;


  beforeEach(function(){
    wrapper = shallow(
      <SearchHeaderContainer
        subscriptionState={SUBSCRIPTION_STATE_UNSUBSCRIBED}
        groupUri='gitterHQ' />
    );
  });

  it('should dispatch the right action when the SearchHeader FollowButton is clicked', () => {
    const handle = spy();
    subscribe(REQUEST_UPDATE_FORUM_SUBSCRIPTION_STATE, handle);
    wrapper.find('SearchHeader').at(0).prop('onSubscribeButtonClick')();

    equal(handle.callCount, 1);
    var args = handle.getCall(0).args;
    equal(args.length, 1);
    deepEqual(args[0], { isSubscribed: true });
  });

});
