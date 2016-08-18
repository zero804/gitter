import React, { PropTypes } from 'react';
import classNames from 'classnames';

export default React.createClass({

  displayName: 'Editor',
  propTypes: {
    className: PropTypes.string,
    name: PropTypes.string,
    children: PropTypes.node,
    onChange: PropTypes.func,
  },

  render(){

    const { className, name } = this.props;
    const compiledClass = classNames('editor', className);

    return (
      <textarea className={compiledClass} name={name} onChange={this.onChange}>
        { this.props.children }
      </textarea>
    );
  },

  onChange(e){
    e.preventDefault();
    this.props.onChange(e.target.value);
  }

});
