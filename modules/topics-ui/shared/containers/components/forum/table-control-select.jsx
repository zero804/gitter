import React, { PropTypes } from 'react';
import _ from 'lodash';
import Select from '../forms/select.jsx';

export default React.createClass({

  displayName: 'TableControlSelect',
  propTypes: {
    options: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired
  },

  render(){
    const { options } = this.props;
    console.log(options);
    const { onChange } = this;
    const activeOption = _.find(options, { active: true });
    let defaultVal = null;
    if(activeOption) { defaultVal = activeOption.value; }

    //TODO remove
    const mappedOptions = options.map((m) => Object.assign(m, {
      label: m.name
    }));
    return (
      <div className="table-control__select-decal">
        <Select
          className="table-control__select"
          options={mappedOptions}
          onChange={onChange}
          defaultValue={defaultVal} />
      </div>
    );
  },

  onChange(e){
    const { onChange } = this.props;
    onChange(e.target.value);
  }

})
