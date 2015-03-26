"use strict";

window.onload = function () {
	MIDI.loadPlugin({
		soundfontUrl: "./soundfont/",
		instruments: ["flute", "acoustic_grand_piano", "acoustic_guitar_nylon", "baritone_sax", "synth_drum", "electric_bass_finger"],
		callback: main
	});
};

function tests() {
	var music = "C C♭ C# D D♭ D# E E♭ E# F F♭ F# G G♭ G# A A♭ A# B B♭ B#"
		.split(/\s+/)
		.map(function (noteName) {
			return Note.fromString(noteName);
		});
	console.debug(music.map(function (note) { return note.toString(); }));
	console.debug(Scale.diatonic(Note.fromString("C1")).toString());
	console.debug(Scale.diatonic(Note.fromString("A1"), 5).toString());
}

var seed = document.location.hash ? document.location.hash.substr(1) : CryptoJS.MD5(Math.random().toString()).toString();
document.getElementById("seed").innerHTML = seed;
document.getElementById("seed").href = "#" + seed;
var seedPos = 0;
function random(min, max) {
    var random = parseInt(seed.substr(seedPos, 8), 16) / 65536 / 65536;
    if (seedPos === 24) {
        seedPos = 0;
        seed = CryptoJS.MD5(seed).toString();
    }
    seedPos += 8;
	return Math.round(min + (max - min) * random);
}

function randomChoose(where) {
    return where[random(0, where.length - 1)];
}

function main() {
	/*tests();
	return;*/
    
    document.getElementById("status").innerHTML = "Playing";

    var wholeLengthSeconds = 1;
	var player = new Player(wholeLengthSeconds);

	var channel1 = new Channel(player);
	var channel2 = new Channel(player);
	var channel3 = new Channel(player);
    
    MIDI.programChange(0, MIDI.GeneralMIDI.byName["acoustic_guitar_nylon"].number);
    MIDI.programChange(1, MIDI.GeneralMIDI.byName["acoustic_guitar_nylon"].number);
    MIDI.programChange(2, MIDI.GeneralMIDI.byName["synth_drum"].number);

	var scale = Scale.diatonic("C1", 0);
    
//    var root = scale.notes[0].clone();
//    var fourth = scale.notes[3].clone();
//    var fifth = scale.notes[4].clone();
//    
//    channel1.start(function () {
//        return randomChoose([
//            [Chord.make3(root, scale).v(63), Chord.make3(root, scale).v(63)],
//            [Note.fromString("P"), Note.fromString("P")],
//            [Chord.make3(fourth, scale).v(63), Chord.make3(fifth, scale).v(63)],
//            [Chord.make3(fourth.d(1/3), scale).v(63), Chord.make3(fifth.d(1/3), scale).v(63), Chord.make3(root.d(1/3), scale).v(63)]
//        ]);
//    });

    var counter = 0;
    channel1.start(function () {
        counter++;
        
        if (counter % 4 === 0 && random(1, 10) < 5) {
            scale = Scale.diatonic(randomChoose("a b c d e f g".split(" ")) + randomChoose([0, 1]), random(0, 6));
            console.debug("scale", scale.toString());
        }
        
        if (counter % 4 === 0 && random(1, 10) < 5) {
            player.wholeDuration = 1 / random(1, 3);
            console.debug("tempo", player.wholeDuration);
        }
        
        return randomChoose([
            // arpegio
            Chord.make4(randomChoose(scale.notes).v(63), scale).notes,
            // chord
            [Chord.make4(randomChoose(scale.notes).v(63), scale)]
        ]);
    });
    
    channel2.start(function () {
        var notes = randomChoose([
            [randomChoose(scale.notes).transpose(24).d(1/3), randomChoose(scale.notes).transpose(24).d(1/3), randomChoose(scale.notes).transpose(24).d(1/3)],
            [randomChoose(scale.notes).transpose(24).d(1/2), randomChoose(scale.notes).transpose(24).d(1/2)],
            [randomChoose(scale.notes).transpose(24).d(1/2 + 1/4), randomChoose(scale.notes).transpose(24).d(1/4)],
            [randomChoose(scale.notes).transpose(24).d(1)]
        ]);
        
        if (random(1, 10) > 5) {
            notes.forEach(function (note) {
                if (random(1, 10) < 3) {
                    note.p();
                }
            });
        }
        
        return notes;
    });
    
//    channel3.start(function () {
//        return randomChose([
//            new Notes("C0, P"),
//            new Notes("C0, P"),
//            new Notes("C0, P"),
//            new Notes("C0/3, P/3, C0/3, P/3, C0/3, P/3"),
//            new Notes("C0/6, P/3, C0/6, P/3, P"),
//            new Notes("P, P, P, P")
//        ]);
//    });
    
    window.channel1 = channel1;
    window.channel2 = channel2;
    window.channel3 = channel3;
    window.player = player;
    window.scale = scale;

    return;


	var music = "C1, P, D1, P, E1, P, F1, P, G1, P, A1, P, B1, P, C2"
		.split(/\s*,\s*/)
		.map(function (noteName) {
			return Note.fromString(noteName);
		});

	channel1.onNoteEnd(function (note) {
		console.debug("1", note.toString());

		if (!note.isPause()) {
			var note2 = cmajorScale.move(note, 2);
			var note3 = cmajorScale.move(note, 4);
			var note4 = cmajorScale.move(note, 6);
			var note5 = cmajorScale.move(note, 8);

			console.debug("Chord", note2.toString(), note3.toString(), note4.toString(), note5.toString());

			channel2.play(note2);
			channel2.play(note3, 0.5/4);
			channel2.play(note4, 0.5/4*2);
			channel2.play(note5, 0.5/4*3);
		}
	});

	channel1.play(music);
}
