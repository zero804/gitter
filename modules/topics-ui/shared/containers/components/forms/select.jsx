import React, { PropTypes } from 'react';
import classNames from 'classnames';

export default React.createClass({

  displayName: 'Select',
  propTypes: {
    onChange: PropTypes.func.isRequired,
    options: PropTypes.arrayOf(PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired
    })).isRequired,
    defaulValue: PropTypes.string,
    className: PropTypes.string
  },

  getDefaultProps(){
    return { defaultValue: '' }
  },

  render(){
    const {options, onChange, classsName } = this.props;
    const className = classNames('select', className);
    return (
      <select className={className} onChange={onChange}>
        { options.map(this.buildChildOption) }
      </select>
    );
  },

  buildChildOption(option, index){
    const {label, value} = option;
    return (
      <option key={`select-option-${label}-${index}`}
        label="label"
        value={value}>
        {label}
      </option>
    );
  }

});
