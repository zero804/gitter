import React, { PropTypes } from 'react';
import _ from 'lodash';

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
      <div className="table-control__select-decal">
        <select className="table-control__select" onChange={onChange} defaultValue={defaultVal}>
          {options.map((opt, index) => this.getChildOption(index, opt))}
        </select>
      </div>
    );
  },

  getChildOption(index, opts){
    const { name, value } = opts;
    return (
      <option key={`table-control-select-index-${index}`}
        label={name}
        value={value}>
          {name}
      </option>
    );
  },

  onChange(e){
    const { onChange } = this.props;
    onChange(e.target.value);
  }

})
