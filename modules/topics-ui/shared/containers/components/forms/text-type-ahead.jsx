import React, { PropTypes } from 'react';
import fuzzysearch from 'fuzzysearch';
import _ from 'lodash';
import classNames from 'classnames';

import Input from './input.jsx';
import {ENTER_KEY, TAB_KEY, UP_KEY, DOWN_KEY} from '../../../../shared/constants/keys';

const arrayBoundWrap = function(index, length) {
  return ((index % length) + length) % length;
};

export default React.createClass({

  displayName: 'TextTypeAhead',
  propTypes: {
    name: PropTypes.string.isRequired,
    completions: PropTypes.arrayOf(PropTypes.string).isRequired,
    onSubmit: PropTypes.func.isRequired,
    value: PropTypes.string,
    placeholder: PropTypes.string,
    className: PropTypes.string,
  },

  getInitialState(){
    const completions =
    this.props.completions.map((c) => ({
      value: c,
      active: false
    }));
    return {
      value: this.props.value,
      shouldShowTypeAhead: false,
      activeCompletions: completions,
      allCompletions: completions,
    };
  },

  render(){
    const {name, className, placeholder} = this.props;
    const {value} = this.state;
    const compiledClass = classNames('type-ahead-wrapper', className);
    return (
      <div className={compiledClass} onKeyDown={this.onKeyDown}>
        <Input
          name={name}
          value={value}
          className="type-ahead-input"
          placeholder={placeholder}
          autoComplete="off"
          onBlur={this.disableCompletions}
          onFocus={this.enableCompletions}
          onChange={this.onInputChange}/>
        {this.getCompletions()}
      </div>
    );
  },

  getCompletions(){
    const {value, shouldShowTypeAhead} = this.state;
    if(!shouldShowTypeAhead) { return; }
    const { activeCompletions } = this.state;
    if(!activeCompletions.length) { return; }

    return (
      <ul className="type-ahead">
      {activeCompletions.map((completion, i) => {
        const className = completion.active ? 'type-ahead__child--active' : 'type-ahead__child'
        return (
          <li
          key={`type-ahead-${completion.value}-${i}`}
          onMouseDown={this.onItemClicked.bind(this, completion)}
          onMouseOver={this.clearActiveCompletions}
          className={className}>
          {completion.value}
          </li>
        );
      })}
      </ul>
    );
  },

  onKeyDown(e){
    if(e.keyCode === UP_KEY) { return this.cycleCompletions(-1); }
    if(e.keyCode === DOWN_KEY) { return this.cycleCompletions(1); }

    if(e.keyCode !== ENTER_KEY && e.keyCode !== TAB_KEY) { return; }
    e.preventDefault();
    const {activeCompletions} = this.state;
    const activeCompletion = _.find(activeCompletions, (c) => c.active);


    //Bail if nothing is active
    if(!activeCompletion) { return; }
    const value = activeCompletion.value;
    this.submit(value);
  },

  onItemClicked(completion, e){
    e.preventDefault();
    this.submit(completion.value);
  },

  submit(val){
    this.props.onSubmit(val);
  },

  onInputChange(val = ''){
    this.setState((state) => Object.assign(state, {
      value: val.trim(),
      activeCompletions: state.allCompletions.filter((c) => fuzzysearch(val.trim(), c.value)),
    }));
  },

  cycleCompletions(dir){
    const {activeCompletions} = this.state;
    const activeCompletion = _.find(activeCompletions, (c) => c.active);

    //clear active completion
    let index = activeCompletions.indexOf(activeCompletion);

    //In the case nothing is selected an we are moving backwards
    //we select the last item in the list (0 + -1)
    if(index === -1 && dir === -1) { index = 0; }

    const nextIndex = arrayBoundWrap(index + dir, activeCompletions.length);

    const newCompletions = activeCompletions.map((c, i) => Object.assign(c, {
      active: (i === nextIndex),
    }))

    this.setState((state) => Object.assign(state, {
      activeCompletions: newCompletions,
    }));
  },

  clearActiveCompletions(){
    const {activeCompletions} = this.state;
    this.setState((state) => Object.assign(state, {
      activeCompletions: activeCompletions.map((c) => Object.assign(c, {
        active: false,
      })),
    }));
  },

  disableCompletions(){
    this.setState((state) => Object.assign(state, {
      shouldShowTypeAhead: false
    }));
  },

  enableCompletions(){
    this.setState((state) => Object.assign(state, {
      shouldShowTypeAhead: true
    }));
  },

});
