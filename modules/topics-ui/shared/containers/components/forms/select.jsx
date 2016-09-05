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
    const {options, onChange, className } = this.props;

    const compiledClass = classNames('select', className);
    const decalClassName = className ? `${className}--decal` : null;
    const compiledDecalClass = classNames('select__decal', decalClassName);

    return (
      <div className={compiledDecalClass}>
        <select className={compiledClass} onChange={this.onChange}>
          { options.map(this.buildChildOption) }
        </select>
      </div>
    );
  },

  buildChildOption(option, index){
    const {label, value} = option;
    return (
      <option key={`select-option-${label}-${index}`}
        label={label}
        value={value}>
        {label}
      </option>
    );
  },

  onChange(e) {
    e.preventDefault();
    this.props.onChange(e.target.value);
  }

});
