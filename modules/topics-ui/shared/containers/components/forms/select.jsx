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
    className: PropTypes.string,
    valid: PropTypes.bool
  },

  getDefaultProps(){
    return { defaultValue: '' }
  },

  render(){
    const { options, className, valid } = this.props;

    const compiledClass = classNames({
      select: true,
      valid: (valid === true),
      invalid: (valid === false)
    }, className);

    const decalClassName = className ? `${className}--decal` : null;

    const compiledDecalClass = classNames({
      'select__decal': true,
      valid: (valid === true),
      invalid: (valid === false)
    }, decalClassName);

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
      <option
        className="option"
        key={`select-option-${label}-${index}`}
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
