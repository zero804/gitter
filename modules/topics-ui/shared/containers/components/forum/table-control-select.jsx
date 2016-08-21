import React, { PropTypes } from 'react';

export default React.createClass({

  displayName: 'TableControlSelect',
  propTypes: {
    options: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired
  },

  render(){
    const { options } = this.props;
    const { onChange } = this;
    const defaultVal = options.reduce(function(memo, option){
      if(!!option.active) { return option.value; }
      return memo;
    });

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
