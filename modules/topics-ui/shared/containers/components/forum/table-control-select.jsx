import React, { PropTypes } from 'react';
import _ from 'underscore';
import Select from '../forms/select.jsx';

export default React.createClass({

  displayName: 'TableControlSelect',
  propTypes: {
    options: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired
  },

  render(){
    const { options } = this.props;
    const { onChange } = this;
    const activeOption = _.find(options, { active: true });
    let defaultVal = null;
    if(activeOption) { defaultVal = activeOption.value; }

    return (
      <Select
        className="table-control__select"
        options={options}
        onChange={onChange}
        defaultValue={defaultVal} />
    );
  },

  onChange(e){
    const { onChange } = this.props;
    onChange(e.target.value);
  }

})
