import assert from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import FeedItem from '../../../../../../shared/containers/components/topic/feed-item.jsx';
import replies from '../../../../../mocks/mock-data/replies';

describe('<FeedItem/>', () => {

  let wrapper;

  beforeEach(() => {
    const reply = replies[0];
    wrapper = shallow(
      <FeedItem item={reply}/>
    );
  });

  it('should render', () => {
    assert(wrapper.length);
  });

});
