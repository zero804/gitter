import assert from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import SearchHeaderContainer from '../../../../../../shared/containers/components/search/SearchHeaderContainer.jsx';
import { SUBSCRIPTION_STATE_UNSUBSCRIBED } from '../../../../../../shared/constants/forum';

describe('<SearchHeaderContainer />', function(){

  let wrapper;


  beforeEach(function(){
    wrapper = shallow(
      <SearchHeaderContainer
        subscriptionState={SUBSCRIPTION_STATE_UNSUBSCRIBED}
        groupUri='gitterHQ' />
    );
  });

  it('should render', () => {
    assert(wrapper.length);
  });

});
