import { equal, ok } from 'assert';
import { spy } from 'sinon';
import React from 'react';
import { shallow } from 'enzyme';
import mockEvt from '../../../../../mocks/event';

import EditableContent from '../../../../../../shared/containers/components/forms/editable-content.jsx';

describe('<EditableContent/>', () => {

  let wrapper;
  const content = {
    text: '',
    body: {
      text: '',
      html: ''
    }
  };
  let onDeleteSpy;

  beforeEach(() => {
    onDeleteSpy = spy();
    wrapper = shallow(
      <EditableContent
        content={content}
        isEditing={true}
        onDelete={onDeleteSpy} />
    );
  });

  it('should render', () => {
    ok(wrapper.length);
  });

  it('should render a div if isEditing is false', () => {
    wrapper = shallow(<EditableContent isEditing={false} content={content}/>);
    equal(wrapper.find('div').length, 1);
  });

  it('should render an Editor when isEditing is true', () => {
    wrapper = shallow(<EditableContent isEditing={true} content={content}/>);
    equal(wrapper.find('Editor').length, 1);
  });

  it('should call onDelete only on second click', () => {
    const deleteButton = wrapper.find('.editable-content__delete').at(0);
    equal(onDeleteSpy.callCount, 0);
    // Prompting for "Are you sure?"
    deleteButton.simulate('click', mockEvt);
    equal(onDeleteSpy.callCount, 0);
    // Confirm click
    deleteButton.simulate('click', mockEvt);
    equal(onDeleteSpy.callCount, 1);
  });

});
