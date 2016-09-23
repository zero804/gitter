import assert from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import EditableContent from '../../../../../../shared/containers/components/forms/editable-content.jsx';

describe('<EditableContent/>', () => {

  let wrapper;

  it('should render', () => {
    wrapper = shallow(<EditableContent/>);
    assert(wrapper.length);
  });

  it('should render a div if isEditing is false', () => {
    wrapper = shallow(<EditableContent isEditing={false}/>);
    assert.equal(wrapper.find('div').length, 1);
  });


  it('should render an Editor when isEditing is true', () => {
    wrapper = shallow(<EditableContent isEditing={true}/>);
    assert.equal(wrapper.find('Editor').length, 1);
  });

});
