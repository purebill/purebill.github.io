(function () { "use strict";
    function Notes(notes) {
        if (typeof notes === "string") {
            notes = notes
                .split(/\s*,\s*/)
                .map(function (noteName) {
                    return Note.fromString(noteName);
                });
        }
        
        if (!(notes instanceof Array) || notes.length === 0) {
            throw new Error("Notes can only be created from an array of Notes");
        }
        
        this.notes = notes;
        this.duration = this.notes.reduce(function (duration, note) { return Math.max(note.duration, duration); }, this.notes[0].duration);
        this.length = this.notes.length;
    }
    
    Notes.prototype.toString = function () {
        return "{" + this.notes
            .map(function (note) { return note.toString(); })
            .join(" ") + "}";
    };
    
    Notes.prototype.v = function (newVelocity) {
        this.notes.forEach(function (note) {
            note.v(newVelocity);
        });
        
        return this;
    };
    
    Notes.prototype.d = function (newDuration) {
        this.notes.forEach(function (note) {
            note.d(newDuration);
        });
        
        return this;
    };
    
    Notes.prototype.transpose = function (semitones) {
        this.notes = this.notes.map(function (note) {
            return note.transpose(semitones);
        });
        
        return this;
    };
        
    // export
    window.Notes = Notes;
}) ();