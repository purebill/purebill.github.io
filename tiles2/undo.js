"use strict";

var Undo = (function () {
  var actions = [];
  var lastActionDone = -1;
  var callbacks = [];

  function add(action) {
    lastActionDone++;
    actions.splice(lastActionDone, actions.length, action);
    try {
      action.do();
    } catch (e) {
      console.error(e);
    }
    triggerOnChangeEvent();
  }

  function redo() {
    if (canRedo()) {
      lastActionDone++;
      try {
        actions[lastActionDone].do();
      } catch (e) {
        console.error(e);
      }
      triggerOnChangeEvent();
      return true;
    }
    return false;
  }

  function undo() {
    if (canUndo()) {
      try {
        actions[lastActionDone].undo();
      } catch (e) {
        console.error(e);
      }
      lastActionDone--;
      triggerOnChangeEvent();
      return true;
    }
    return false;
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
    canUndo: canUndo,
    canRedo: canRedo,
    onChange: onChange
  };
}) ();