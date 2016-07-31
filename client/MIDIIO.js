var MIDIIO = function(onStepCallback, onReceivedStartCallback, onReceivedNoteOnCallback) {
    this._midiClockCount = 0;
    this._midiAccess = null;
    this._midiInputs = null;

    this._onStepCallback = onStepCallback;
    this._onReceivedStartCallback = onReceivedStartCallback;
    this._onReceivedNoteOnCallback = onReceivedNoteOnCallback;

    this._expected = 0;
    this._clockCountEpochInMs = 1000;
    this._midiClockCountForMeasureBPM = 0;

    this._estimatedBPM = 0;

    if (window.navigator.requestMIDIAccess) {
        window.navigator.requestMIDIAccess().then(
            function(access) {
                this._midiAccess = access;
                this._midiAccess.onconnect = function (event) {
                    // MIDI port の状態が変わった時も、イベントハンドラの再登録を行う
                    this.setupMIDIEventHandler(access);
                }.bind(this);

                // MIDI イベントハンドラの登録を行う
                this.setupMIDIEventHandler(access);
            }.bind(this),
            function() {
                // エラー処理
            }
        );
    }

    // クロックからテンポを計算するタイマをスタート
    this._expected = Date.now() + this._clockCountEpochInMs;
    setTimeout(function() {
        this.onTimer();
    }.bind(this), this._clockCountEpochInMs);
};


MIDIIO.prototype.setupMIDIEventHandler = function(midiAccess) {
    var inputs = null;
    if (typeof midiAccess.inputs === "function") {
        inputs = midiAccess.inputs();
    } else {
        var iter = midiAccess.inputs.values();
        inputs = [];
        for (var o = iter.next(); !o.done; o = iter.next()) {
            inputs.push(o.value);
        }
    }

    for (var port = 0; port < inputs.length; port++) {
        (function () {
            var _port = port;
            inputs[_port].onmidimessage = function (event) {
                var statusByte = event.data[0];
                if (statusByte == 0xf8) {
                    this._midiClockCount++;
                    if (this._midiClockCount >= 12) {
                        this._midiClockCount = 0;
                        this._onStepCallback();
                    }

                    this._midiClockCountForMeasureBPM++;
                } else if (statusByte == 0xfa) {
                    this._midiClockCount = 0;
                    this._onReceivedStartCallback();
                } else if ((statusByte & 0xf0) == 0x90) {
                    var noteNo = event.data[1];
                    var velocity = event.data[2];

                    this._onReceivedNoteOnCallback(statusByte, noteNo, velocity);
                }
            }.bind(this);

            /*
            inputs[_port].ondisconnect = function (event) {
                // ポートが切断された時の処理
            };
            */
        }.bind(this)());
    }

    this._midiInputs = inputs;
};

MIDIIO.prototype.onTimer = function() {
    this._expected += this._clockCountEpochInMs;
    setTimeout(function() {
        this.onTimer();
    }.bind(this), this._expected - Date.now());

    const kClocksInSecToBPM = 120.0 / 48.0; // 1 秒間のクロック数から BPM を計算する係数
    //console.log("count:" + this._midiClockCountForMeasureBPM * kClocksInSecToBPM);
    this._estimatedBPM = this._midiClockCountForMeasureBPM * kClocksInSecToBPM;
    this._midiClockCountForMeasureBPM = 0;
};

MIDIIO.prototype.estimatedBPM = function() {
    return this._estimatedBPM;
};
