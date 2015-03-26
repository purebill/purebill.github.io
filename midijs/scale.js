(function () { "use strict";
    function Scale(notes) {
        Notes.call(this, notes);

        var self = this;
        this.notes.forEach(function (note) {
            if (self.notes.filter(function (e) { return note.midiCode % 12 === e.midiCode % 12; }).length > 1) {
                throw new Error("You can't have more than one copy of a note in the scale: " + note.toString());
            }
        });
    }
    
    Scale.prototype = Object.create(Notes.prototype);

    Scale.prototype.move = function (theNote, amount) {
        var pos = -1;
        for (var i = 0; i < this.notes.length; i++) {
            var note = this.notes[i];

            if (note.midiCode % 12 === theNote.midiCode % 12) {
                pos = i;
                break;
            }
        }

        if (pos !== -1) {
            var newPos;
            if (amount < 0) {
                newPos = this.notes.length + amount % this.notes.length;
            } else {
                newPos = pos + amount;
            }

            var noteInScale = this.notes[pos];
            var targetInScale = this.notes[newPos % this.notes.length];

            var midiCodeDiff = targetInScale.midiCode - noteInScale.midiCode + Math.floor(amount / this.notes.length) * 12;

            if (amount > 0 && targetInScale.midiCode < noteInScale.midiCode) {
                midiCodeDiff += 12;
            } else if (amount < 0 && targetInScale.midiCode > noteInScale.midiCode) {
                midiCodeDiff -= 12;
            }

            var result = theNote.clone();
            result.midiCode += midiCodeDiff;

            return result;
        } else {
            throw new Error("Can't move the note that is not in the scale: " + theNote);
        }
    };

    var diatonicIntervals = [2, 2, 1, 2, 2, 2, 1];

    Scale.diatonic = function (rootNote, mode) {
        rootNote = rootNote || Note.fromString("C1");
        mode = mode || 0;

        if (typeof rootNote === "string") {
            rootNote = Note.fromString(rootNote);
        }

        if (mode < 0 || mode > 6) {
            throw new Error("Mode can only be between 0 and 6");
        }

        var notes = [];
        var prevNote = rootNote.clone();
        notes.push(prevNote);
        for (var i = 0; i < 6; i++) {
            var note = prevNote.clone();
            note.midiCode += diatonicIntervals[(i + mode) % diatonicIntervals.length];
            notes.push(note);

            prevNote = note;
        }

        return new Scale(notes);
    };
    
    Scale.prototype.toString = function () {
        return this.notes
            .map(function (note) { return note.toString(); })
            .join(" ");
    };
    
    // export
    window.Scale = Scale;
}) ();