import assert from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import WatchForumLink from '../../../../shared/componentslinksfollow-forum-link.jsx';

describe.only('<WatchForumLink/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<WatchForumLink/>);
  });

  it('should fail a test because you should write some', () => {
    assert(false, 'Srsly, write some tests');
  });

});
