const stepIndicatorColorOn  = '#FF4646';
const stepIndicatorColorOff = 'transparent';
const stepOnColor = 'mediumseagreen';

const voicesURI = '/api/voices';
const soundsURI = '/api/sounds'
//const voicesURI = 'voices.json';
//const soundsURI = 'sounds.json'

//
// utility functions
//
function loadAudioBuffer(url) {
    return new Promise(function(resolve, reject) {
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';

        request.onload = function() {
            resolve(request.response);
        };

        request.send();
    });
}

function loadSounds() {
    return new Promise(function(resolve, reject) {
        var request = new XMLHttpRequest();
        request.open('GET', soundsURI, true);
        request.responseType = 'json';

        request.onload = function() {
            resolve(request.response);
        };

        request.send();
    });
}

function loadVoices() {
    return new Promise(function(resolve, reject) {
        var request = new XMLHttpRequest();
        request.open('GET', voicesURI, true);
        request.responseType = 'json';

        request.onload = function() {
            resolve(request.response);
        };

        request.send();
    });
}


function fix2(value) {
    return ("0" + value).slice(-2);
}

//
// Application class
//
var App = function() {
    this._soundPlayer = null;
    this._midiIO = null;

    this._midiClockSync = false;

    this._latestTapDate = null;
};

App.prototype.setStepColor = function(step, color) {
    for (var track = 0; track < SEQ_TRACKS; track++) {
        var actualColor = color;
        if (this._soundPlayer.step(track, step) === true) {
            actualColor = stepOnColor;
        }

        $("#step" + fix2(step) + "_" + fix2(track)).css("background-color", actualColor);
    }
};


App.prototype.createView = function(trends, voices) {
    for (var track = 0; track < SEQ_TRACKS; track++) {
        var record = "";

        record += '<tr id="trackrow' + fix2(track) + '">';

        record += '<td height="70px">';
        record += '<a href="' + trends[track].url + '">' + trends[track].word + '</a>';
        record += '</td>';

        for (var step = 0; step < SEQ_STEPS; step++) {
            var img;
            if (step % 4 === 0) {
                img = 'step_acc.png';
            } else {
                img = 'step.png';
            }
            record += '<td><img id="step' + fix2(step) + '_' + fix2(track) + '" src="' + img + '" style="padding: 10px; vertical-align:middle;"></td>';
        }

        record += '<td width="70px" align="center"><input class="pitch_knob" id="pitch_knob' + fix2(track) + '" value=0></td>';
        record += '<td width="70px" align="center"><input class="delay_knob" id="delay_knob' + fix2(track) + '" value=30></td>';
        record += '<td width="70px" align="center"><input class="offset_knob" id="offset_knob' + fix2(track) + '" value=0></td>';
        record += '<td><select class="voice" id="voice' + fix2(track) + '">';

        voices.forEach(function(voice) {
            record += '<option value="' + voice + '">' + voice + '</option>';
        });

        record += '</select></td>';

        record += '</tr>';

        $('#seq').append(record);
    }

    var soundPlayer = this._soundPlayer;

    $("[id^=step00]").css("background-color", stepIndicatorColorOn);
    $("img").on('click', function() {
                    var id = $(this).prop("id").substring(4); // "step" の文字列を取り除く
                    var splitted = id.split("_");
                    var step = Number(splitted[0]);
                    var track = Number(splitted[1]);

                    if (soundPlayer.step(track, step) == true) {
                        $(this).css("background-color", "transparent");
                        soundPlayer.setStep(track, step, false);
                    } else {
                        $(this).css("background-color", stepOnColor);
                        soundPlayer.setStep(track, step, true);
                    }
                 });


    $(".pitch_knob").knob({
                    'min' : -100,
                    'max' :  100,
                    'step' : 1,
                    'width' : 50,
                    'height' : 50,
                    'displayInput' : false,
                    'angleOffset' : -145,
                    'angleArc' : 290,
                    'change' : function(value) {
                        var track = Number(this.$.attr("id").substring(10)); // "pitch_knob" の文字を取り除く
                        var rate = (value + 100) / 200.0 * 0.75 + 0.75; // -100-100 to 0.75-1.5
                        soundPlayer.setPlayRate(track, rate);
                    }
                });

    $(".delay_knob").knob({
                    'min' : 0,
                    'max' : 90,
                    'step' : 1,
                    'width' : 50,
                    'height' : 50,
                    'displayInput' : false,
                    'angleOffset' : -145,
                    'angleArc' : 290,
                    'fgColor' : 'orange',
                    'change' : function(value) {
                        var track = Number(this.$.attr("id").substring(10)); // "delay_knob" の文字を取り除く
                        var feedback = value / 100.0; // -100-100 to 0.75-1.5
                        soundPlayer.setDelayFeedback(track, feedback);
                    }
                });

    $(".offset_knob").knob({
                    'min' : 0,
                    'max' : 1000,
                    'step' : 1,
                    'width' : 50,
                    'height' : 50,
                    'displayInput' : false,
                    'angleOffset' : -145,
                    'angleArc' : 290,
                    'fgColor' : 'darkkhaki',
                    'change' : function(value) {
                        var track = Number(this.$.attr("id").substring(11)); // "delay_knob" の文字を取り除く
                        var offset = value / 1000.0; // -100-100 to 0.75-1.5
                        soundPlayer.setPlayStartOffset(track, offset);
                    }
                });

    $(".voice").on('change', function(event) {
        var track = Number($(event.target).attr("id").substring(5)); // "voice" の文字列を取り除く
        var voice = $(event.target).val();

        loadAudioBuffer("sounds/" + (track + 1) + "_" + voice + ".wav")
            .then(function(buffer) {
                soundPlayer.setAudioBuffer(track, buffer);
            }, function() { /* ERROR: failure to load audio buffer */});
    }.bind(this));
};

App.prototype.blinkTrack = function(track) {
    $("#trackrow" + fix2(track)).css("background-color", "lawngreen")
                                .animate( { "background-color" : "transparent"});
};

App.prototype.onload = function() {
    //
    // Initialize MIDIIO class
    //
    var onStepCallback = function() {
        // callback when sequencer step advances
        if (this._midiClockSync === true) {
            this._soundPlayer.incStep();
        }
    }.bind(this);

    var onReceivedStartCallback = function() {
        // callback when receiving MIDI realtime message START(0xFA)
        if (this._midiClockSync === true) {
            this._soundPlayer.rewindSeq();
            this._soundPlayer.playCurrentStep();
        }
    }.bind(this);

    var noteNoForTrack = [ 48, 50, 52, 53, 55, 57, 59, 60 ];
    var onReceivedNoteOnCallback = function(statusByte, noteNo, velocity) {
        // callback when receiving MIDI Note On
        // play the track coressponds to the node number
        for (var track = 0; track < SEQ_TRACKS; track++) {
            if (noteNoForTrack[track] == noteNo) {
                this._soundPlayer.auditionTrack(track);
                this.blinkTrack(track);
                break;
            }
        }
    }.bind(this);

    this._midiIO = new MIDIIO(onStepCallback, onReceivedStartCallback, onReceivedNoteOnCallback);

    //
    // setup sound playing engine
    //
    var onUpdateStepCallback = function(prevStep, curStep) {
        // callback when step advances
        this.setStepColor(prevStep, stepIndicatorColorOff);
        this.setStepColor(curStep , stepIndicatorColorOn);

        for (var track = 0; track < SEQ_TRACKS; track++) {
            if (this._soundPlayer.step(track, curStep) === true) {
                this.blinkTrack(track);
            }
        }

    }.bind(this);

    var soundPlayer = new SoundPlayer(onUpdateStepCallback);
    this._soundPlayer = soundPlayer;

    // set default BPM
    soundPlayer.setBpm(120);

    //
    // request trend words and voice list to server
    //
    var _sounds = null;
    var _voices = null;

    // request trend words
    loadSounds()
        .then(function(sounds) {
            // request trend words succeeded
            _sounds = sounds;

            // NEXT: request voice list
            return loadVoices();
        }, function() { /* ERROR: failure to laod sounds */ })
        .then(function(voices) {
            // request voice list succeeded
            _voices = voices;

            // NEXT: create step sequencer view
            this.createView(_sounds, _voices);

            // request audio waveform for all tracks to server
            function loop(track) {
                loadAudioBuffer("sounds/" + (track + 1) + "_" + _voices[0] + ".wav")
                    .then(function(buffer) {
                        soundPlayer.setAudioBuffer(track, buffer);

                        if (track < SEQ_TRACKS) {
                            setTimeout(function() {
                                loop(track + 1);
                            }, 100);
                        }
                    }, function() { /* ERROR: failure to load audio buffer */ });
            }
            loop(0);
        }.bind(this), function() { /* ERROR: failure to load voices */ });


    //
    // UI handlers
    //
    $("#startButton").on('click', function() {
        soundPlayer.startSeq();
    });

    $("#stopButton").on('click', function() {
        soundPlayer.stopSeq();
    });

    $("#bpm").on('change', function(event) {
        soundPlayer.setBpm($(event.target).val());
    });

    $("#extsync").on('click', function(event) {
        this._midiClockSync = $(event.target).prop("checked");

        if (this._midiClockSync === true) {
            // Reset clock counter when turn MIDI Clock sync checkbox on
            soundPlayer.stopSeq();
        } else {
            // reset BPM value when disabled clock syncing
            $("#bpm").val(120);
            this._soundPlayer.setBpm(120);
        }
    }.bind(this));

    $("#tapButton").on('click', function(event) {
        if (this._latestTapDate == null) {
            this._latestTapDate = Date.now();
        } else {
            var diff = Date.now() - this._latestTapDate;
            this._latestTapDate = Date.now();
            var bpm = parseInt(60000.0 / diff);

            $("#bpm").val(bpm);
            this._soundPlayer.setBpm(bpm);
        }

    }.bind(this));

    //
    // the timer for updating estimated BPM value from MIDI clock
    // while the app is in MIDI clock sync mode
    //
    setInterval(function() {
        if (this._midiClockSync === true) {
            var bpm = this._midiIO.estimatedBPM();

            $("#bpm").val(bpm);
            this._soundPlayer.setBpm(bpm);
        }
    }.bind(this), 1000);
};
