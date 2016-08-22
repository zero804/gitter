import assert from 'assert';
import { shallow } from 'enzyme';
import React from 'react';
import App from '../../../browser/js/app.jsx';
import mockRouter from '../../mocks/router';

describe('App', function() {

  it('should set the right state when rendered with the forum route', function(){
    const wrapper = shallow(<App router={mockRouter} />);
    assert.equal(wrapper.state('route'), 'forum');
    assert.equal(wrapper.state('groupName'), 'gitterHQ');
  });

  it('should render a ForumContainer when rendered with the forum route', function(){
    mockRouter.set({ route: 'forum', groupName: 'gitterHQ' });
    const wrapper = shallow(<App router={mockRouter} />);
    assert.equal(wrapper.find('ForumContainer').length, 1);
  });

  it('should render a ForumContainer when rendered with the create-topic route', () => {
    mockRouter.set({ route: 'create-topic', groupName: 'gitterHQ', createTopic: true });
    const wrapper = shallow(<App router={mockRouter} />);
    assert.equal(wrapper.find('ForumContainer').length, 1);
    assert.equal(wrapper.state('createTopic'), true);
  });

});
