(function () { "use strict";
    var notes = {
        "C": 48, "C#": 49,
        "D": 50, "D#": 51, "D♭": 49,
        "E": 52, "E♭": 51, "E#": 53,
        "F": 53, "F♭": 52, "F#": 54,
        "G": 55, "G#": 56, "G♭": 54,
        "A": 57, "A#": 58, "A♭": 56,
        "B": 59, /*"C♭": 59, "B#": 60,*/ "B♭": 58,

        "P": 0
    };
    
    var midiCodes = {};
    for (var note in notes) {
        var midiCode = notes[note];
        if (midiCodes[midiCode]) {
            midiCodes[midiCode] = note.match(/[♭#]/) ? midiCodes[midiCode] : note;
        } else {
            midiCodes[midiCode] = note;
        }
    }

    function Note(midiCode, duration, velocity) {
        duration = duration || 1;
        velocity = velocity || 127;
        
        this.midiCode = midiCode;
        this.duration = duration;
        this.velocity = velocity;
    }
    
    Note.prototype.d = function (newDuration) {
        this.duration = newDuration;
        return this;
    };
    
    Note.prototype.v = function (newVelocity) {
        this.velocity = newVelocity;
        return this;
    };
    
    Note.prototype.p = function () {
        this.midiCode = 0;
        return this;
    };

    Note.fromString = function (name) {
        var a = name.match(/^([a-gp][#♭b]?)(\d?)(\/(\d+))?$/i);
        if (!a) {
            throw new Error("Bad note name: " + name);
        }

        var note = a[1].toUpperCase().replace(/^(.)B$/, "$1♭");
        var octave = a[2] ? parseInt(a[2]) : 2;
        var length = a[4] ? parseInt(a[4]) : 1;

        if (note === "C♭") {
            note = "B";
            octave--;
        } else if (note === "B#") {
            note = "C";
            octave++;
        }

        if (length <= 0) {
            throw new Error("Bad length " + legnth);
        }

        var midiNote = notes[note] + (octave - 2) * 12;
        midiNote = midiNote < 0 ? 0 : midiNote;

        var duration = 1 / length;

        return new Note(midiNote, duration, 127);
    };

    Note.prototype.toString = function (justName) {
        if (this.midiCode === 0) {
            return "P/" + Math.round(1 / this.duration);
        } else {
            var midiCode = this.midiCode;
            var octave = 2;

            if (this.midiCode < 48) {
                octave -= Math.ceil((48 - this.midiCode) / 12);
                midiCode += Math.ceil((48 - this.midiCode) / 12) * 12;
            } else if (this.midiCode > 59) {
                octave += Math.ceil((this.midiCode - 59) / 12);
                midiCode -= Math.ceil((this.midiCode - 59) / 12) * 12;
            }

            var note = midiCodes[midiCode];

            if (justName) {
                return note;
            } else {
                return note + octave + "/" + Math.round(1 / this.duration);
            }
        }
    };

    Note.prototype.clone = function () {
        return new Note(this.midiCode, this.duration, this.velocity);
    };

    Note.prototype.isPause = function () {
        return this.midiCode === 0;
    };
    
    Note.prototype.transpose = function (semitones) {
        var note = this.clone();
        note.midiCode += semitones;
        
        return note;
    };
    
    // export
    window.Note = Note;
})();
