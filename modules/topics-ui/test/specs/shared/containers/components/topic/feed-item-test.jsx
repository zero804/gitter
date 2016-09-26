import assert from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import FeedItem from '../../../../../../shared/containers/components/topic/feed-item.jsx';

describe('<FeedItem/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<FeedItem/>);
  });

  it('should fail a test because you should write some', () => {
    assert(false, 'Srsly, write some tests');
  });

});
