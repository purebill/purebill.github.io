"use strict";

var Undo = (function () {
  var actions = [];
  var lastActionDone = -1;
  var callbacks = [];

  function add(action) {
    lastActionDone++;
    actions.splice(lastActionDone, actions.length, action);
    try {
      const result = action.do();
      if (result instanceof Promise) result.then(triggerOnChangeEvent);
      else triggerOnChangeEvent();
      return result;
    } catch (e) {
      console.error(e);
    }
  }

  function redo() {
    if (canRedo()) {
      try {
        const result = actions[++lastActionDone].do();
        if (result instanceof Promise) result.then(triggerOnChangeEvent);
        else triggerOnChangeEvent();
      } catch (e) {
        console.error(e);
      }
    }
  }

  function undo() {
    if (canUndo()) {
      try {
        const result = actions[lastActionDone--].undo();
        if (result instanceof Promise) result.then(triggerOnChangeEvent);
        else triggerOnChangeEvent();
      } catch (e) {
        console.error(e);
      }
    }
  }

  function canUndo() {
    return lastActionDone > -1;
  }

  function canRedo() {
    return lastActionDone < actions.length - 1;
  }

  function reset() {
    actions = [];
    lastActionDone = -1;
    triggerOnChangeEvent();
  }

  function onChange(f) {
    callbacks.push(f);
  }

  function triggerOnChangeEvent() {
    callbacks.forEach(function (it) {
      try {
        it();
      } catch (e) {
        console.error(e);
      }
    });
  }

  return {
    reset: reset,
    do: add,
    redo: redo,
    undo: undo,
    undoAll: () => {while(canUndo()) undo()},
    canUndo: canUndo,
    canRedo: canRedo,
    onChange: onChange
  };
}) ();

export default Undo;