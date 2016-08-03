"use strict";

import React, { PropTypes } from 'react';

module.exports = React.createClass({

  displayName: 'TableControlSelect',
  propTypes: {
    options: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired
  },

  render(){
    const { options } = this.props;
    console.log('-----------------------');
    console.log(options);
    console.log('-----------------------');
    const { onChange } = this;
    return (
      <select className="table-control__select" onChange={ onChange }>
        {options.map((opt, index) => this.getChildOption(index, opt))}
      </select>
    );
  },

  getChildOption(index, opts){
    console.log(index, opts);
    const { name, value, selected } = opts;
    return (
      <option key={`table-control-select-index-${index}`}
        label={name}
        value={value}>
          {name}
      </option>
    );
  },

  onChange(e){
    console.log(e);
    const { onChange } = this.props;
    onChange(e.target.value);
  }

})
