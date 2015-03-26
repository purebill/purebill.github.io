(function () { "use strict";
    function Chord(notes) {
        Notes.call(this, notes);
    }
    
    Chord.prototype = Object.create(Notes.prototype);
    
    Chord.make3 = function (rootNote, scale) {
        var notes = [rootNote];
        notes.push(scale.move(rootNote, 2));
        notes.push(scale.move(rootNote, 4));
        return new Chord(notes);
    };
    
    Chord.make4 = function (rootNote, scale) {
        var notes = [rootNote];
        notes.push(scale.move(rootNote, 2));
        notes.push(scale.move(rootNote, 4));
        notes.push(scale.move(rootNote, 6));
        return new Chord(notes);
    };
    
    Chord.make5 = function (rootNote, scale) {
        var notes = [rootNote];
        notes.push(scale.move(rootNote, 2));
        //notes.push(scale.move(rootNote, 4));
        notes.push(scale.move(rootNote, 6));
        notes.push(scale.move(rootNote, 8));
        return new Chord(notes);
    };
    
    // export
    window.Chord = Chord;
}) ();