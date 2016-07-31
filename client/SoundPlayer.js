/* memo
    公開する関数と非公開にする関数を分ける
*/
const SEQ_TRACKS = 8;
const SEQ_STEPS = 16;

var SoundPlayer = function (onUpdateStateCallback) {
    this._curStep = 0;
    this._playRate = [];
    this._delayFeedback = [];
    this._playStartOffset = [];
    this._sampleBuffer = new Array(SEQ_TRACKS);
    this._isPlaying = false;

    this._expected = 0;
    this._stepInMs = 125;

    this._onIncStepCallback = onUpdateStateCallback;

    this._seqData = new Array(SEQ_TRACKS);
    for (var track = 0; track < SEQ_TRACKS; track++) {
        this._seqData[track] = new Array(SEQ_STEPS);
        for (var step = 0; step < SEQ_STEPS; step++) {
            this._seqData[track][step] = false;
        }

        // reset play rate
        this._playRate[track] = 1.0;

        // reset delay feedback level
        this._delayFeedback[track] = 0.3;

        // reset play start offset
        this._playStartOffset[track] = 0;
    }

    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    this._audioContext = new AudioContext();

};

SoundPlayer.prototype.setAudioBuffer = function(track, buffer) {
    if (track < 0 || SEQ_TRACKS <= track) {
        return
    }

    this._audioContext.decodeAudioData(buffer, function(decodedBuffer) {
        this._sampleBuffer[track] = decodedBuffer;
    }.bind(this));
};


SoundPlayer.prototype.playSound = function(buffer, rate, delayFeedback, playStartOffset) {
    if (delayFeedback > 0.9) {
        delayFeedback = 0.9; // 発振を防ぐためフィードバック量を制限する
    }

    var audioContext = this._audioContext;

    var delayGain = audioContext.createGain();
    delayGain.gain.value = delayFeedback;
    delayGain.connect(audioContext.destination);

    var delay = audioContext.createDelay();
    delay.delayTime.value = this._stepInMs * 2 / 1000.0; // 0.5
    delay.connect(delayGain);

    delayGain.connect(delay);

    var source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    source.connect(delay);
    source.start(0, playStartOffset);

    source.connect(audioContext.destination);
};

SoundPlayer.prototype.setBpm = function(bpm) {
    this._stepInMs = 60 / bpm / 4 * 2 * 1000; // 16 steps in 2 measures
};

SoundPlayer.prototype.playCurrentStep = function() {
    for (var track = 0; track < SEQ_TRACKS; track++) {
        if (this._seqData[track][this._curStep]) {
            this.playSound(this._sampleBuffer[track], this._playRate[track], this._delayFeedback[track], this._playStartOffset[track]);
        }
    }
};

SoundPlayer.prototype.auditionTrack = function(track) {
    if (track < 0 || SEQ_TRACKS <= track) {
        return;
    }

    this.playSound(this._sampleBuffer[track], this._playRate[track], this._delayFeedback[track], this._playStartOffset[track]);
};

SoundPlayer.prototype.incStep = function() {
    var prevStep = this._curStep;

    this._curStep++;
    if (this._curStep >= SEQ_STEPS) {
        this._curStep = 0;
    }

    var curStep = this._curStep;

    this.playCurrentStep();

    if (this._onIncStepCallback != null) {
        this._onIncStepCallback(prevStep, curStep);
    }
};

SoundPlayer.prototype.startSeq = function() {
    if (this._isPlaying == false) {
        this._isPlaying = true;

        var prevStep = this._curStep;

        this._curStep = 0;
        this.playCurrentStep();

        if (this._onIncStepCallback != null) {
            this._onIncStepCallback(prevStep, 0);
        }

        this._expected = Date.now() + this._stepInMs;
        setTimeout(function() {
            this.onTimer();
        }.bind(this), this._stepInMs);
    }
};

SoundPlayer.prototype.stopSeq = function() {
    if (this._isPlaying === true) {
        this._isPlaying = false;
    }
};

SoundPlayer.prototype.rewindSeq = function() {
    var prevStep = this._curStep;
    this._curStep = 0;

    if (this._onIncStepCallback != null) {
        this._onIncStepCallback(prevStep, 0);
    }
};

SoundPlayer.prototype.curStep = function() {
    return this._curStep;
};

SoundPlayer.prototype.isPlaying = function() {
    return this._isPlaying;
};

SoundPlayer.prototype.setPlayStartOffset = function(track, offset) {
    this._playStartOffset[track] = offset;
};

SoundPlayer.prototype.setDelayFeedback = function(track, feedback) {
    this._delayFeedback[track] = feedback;
};

SoundPlayer.prototype.setPlayRate = function(track, rate) {
    this._playRate[track] = rate;
};

SoundPlayer.prototype.setStep = function(track, step, on) {
    this._seqData[track][step] = on;
};

SoundPlayer.prototype.step = function(track, step) {
    return this._seqData[track][step];
};

SoundPlayer.prototype.onTimer = function() {
    this._expected += this._stepInMs;
    if (this._isPlaying) {
        setTimeout(function() {
            this.onTimer();
        }.bind(this), this._expected - Date.now());
    }

    this.incStep();
};
