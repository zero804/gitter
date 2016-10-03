import React from 'react';
import classNames from 'classnames';

export default React.createClass({

  displayName: 'Panel',

  propTypes: {
    id: React.PropTypes.string,
    className: React.PropTypes.string,
    children: React.PropTypes.node
  },

  render(){

    const { id, className } = this.props;
    const compiledClass = classNames('panel', className);

    return (
      <div
        id={id}
        className={compiledClass}>
        { this.props.children }
      </div>
    );
  }
});
