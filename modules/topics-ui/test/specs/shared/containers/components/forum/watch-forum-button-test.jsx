import assert from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import WatchForumButton from '../../../../../../shared/containers/components/forum/watch-forum-button.jsx';

describe('<WatchForumButton/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<WatchForumButton/>);
  });

  it('should fail a test because you should write some', () => {
    assert(false, 'Srsly, write some tests');
  });

});
