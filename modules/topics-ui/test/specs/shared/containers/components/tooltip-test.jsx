import { equal, ok } from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import Tooltip from '../../../../../shared/containers/components/tooltip.jsx';

describe('<Tooltip/>', () => {

  let wrapper;
  beforeEach(() => {
    wrapper = shallow(
      <Tooltip tooltip="test">
        <div className="test-child"></div>
      </Tooltip>
    );
  });

  it('should not have active class when tooltip is not provided', () => {
    const wrapper = shallow(<Tooltip />);
    const overlayEl = wrapper.find('.tooltip__overlay');
    equal(overlayEl.hasClass('active'), false);
  });

  it('should have active class when tooltip is provided', () => {
    const wrapper = shallow(<Tooltip tooltip="test" />);
    const overlayEl = wrapper.find('.tooltip__overlay');
    equal(overlayEl.hasClass('active'), true);
  });

  it('should render the children', () => {
    const testChild = wrapper.find('.test-child');
    ok(testChild);
  });
});
