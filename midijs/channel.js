(function () { "use strict";
    function Channel(player) {
        this.player = player;
        this.channel = this.player.nextChannel();
        this.reset();
    }

    Channel.prototype.onNoteStart = function (callback) {
        this.onNoteStartCallbacks.push(callback);
    };

    Channel.prototype.onNoteEnd = function (callback) {
        this.onNoteEndCallbacks.push(callback);
    };
    
    Channel.prototype.reset = function () {
        this.onNoteStartCallbacks = [];
        this.onNoteEndCallbacks = [];
    };

    Channel.prototype.play = function(music, theDelay) {
        if (music instanceof Notes) {
            music = music.notes;
        }

        if (!(music instanceof Array)) {
            music = [music];
        }

        var self = this;
        var start = 0;
        music.forEach(function (musicItem) {
            var duration = musicItem.duration * self.player.wholeDuration;

            var delay = theDelay !== undefined ? theDelay : start;
            start += duration;

            var notes;
            if (musicItem instanceof Note) {
                notes = [musicItem];
            } else if (musicItem instanceof Chord) {
                notes = musicItem.notes;
            } else {
                throw new Error("Unknown music item: " + musicItem);
            }
            
            notes.forEach(function (note) {
                MIDI.noteOn(self.channel, note.midiCode, note.velocity, delay);
                MIDI.noteOff(self.channel, note.midiCode, delay + duration);
            });

            setTimeout(function () {
                self.onNoteStartCallbacks.forEach(function (callback) {
                    callback(musicItem);
                });
            }, delay * 1000);

            setTimeout(function () {
                self.onNoteEndCallbacks.forEach(function (callback) {
                    callback(musicItem);
                });
            }, (delay + duration) * 1000);
        });
    };

    Channel.prototype.stop = function () {
        this.reset();
        //MIDI.stopAllNotes();
    };
    
    Channel.prototype.start = function (generator) {
        var music = generator();

        this.reset();

        var self = this;
        var counter = 0;
        this.onNoteEnd(function (note) {
            console.debug("channel#" + self.channel, note.toString());
            counter++;

            if (counter === music.length) {
                self.start(generator);
            }
        });

        self.play(music);
    };
    
    // export
    window.Channel = Channel;
})();
