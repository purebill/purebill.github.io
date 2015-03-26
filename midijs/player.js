(function () { "use strict";
    function Player(wholeDuration) {
        this.channel = 0;
        this.wholeDuration = wholeDuration ? wholeDuration : 1;

        MIDI.setVolume(0, 127);
    }

    Player.prototype.nextChannel = function () {
        return this.channel++;
    };
    
    // export
    window.Player = Player;
}) ();