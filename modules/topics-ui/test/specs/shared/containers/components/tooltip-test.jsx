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

  it('should have hidden class when tooltip not provided', () => {
    const wrapper = shallow(<Tooltip />);
    const overlayEl = wrapper.find('.tooltip__overlay');
    equal(overlayEl.hasClass('active'), true);
  });

  it('should not have hidden class when tooltip provided', () => {
    const wrapper = shallow(<Tooltip tooltip="test" />);
    const overlayEl = wrapper.find('.tooltip__overlay');
    equal(overlayEl.hasClass('active'), false);
  });

  it('should render the children', () => {
    const testChild = wrapper.find('.test-child');
    ok(testChild);
  });
});
