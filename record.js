
var MIN_DB_LEVEL = -85;
var MAX_DB_LEVEL = -30;

var DB_LEVEL_RANGE = MAX_DB_LEVEL - MIN_DB_LEVEL;
var HEAT_COLORS = [];
function generateHeatColors() {
  function color(value) {
    var h = (1 - value) * 240;
    return "hsl(" + h + ", 100%, 50%)";
  }
  for (var i = 0; i < 256; i++) {
    HEAT_COLORS.push(color(i / 256));
  }
}
generateHeatColors();
function clamp(v, a, b) {
  if (v < a) v = a;
  if (v > b) v = b;
  return v;
}
var darkScale = chroma.scale("Spectral").domain([ 1, 0 ]);
var DarkTheme = {
  backgroundColor: "#212121",
  scale: function(value) {
    return darkScale(value);
  }
};
var lightScale = chroma.scale("Set1");
var LightTheme = {
  backgroundColor: "#F5F5F5",
  scale: function(value) {
    return lightScale(value);
  }
};
var hotScale = chroma.scale({
  colors: [ "#000000", "#ff0000", "#ffff00", "#ffffff" ],
  positions: [ 0, .25, .75, 1 ],
  mode: "rgb",
  limits: [ 0, 300 ]
});
var hotScale = chroma.scale([ "#000000", "#ff0000", "#ffff00", "#ffffff" ]);

var __extends = this && this.__extends || function() {
  var extendStatics = Object.setPrototypeOf || {
    __proto__: []
  } instanceof Array && function(d, b) {
    d.__proto__ = b;
  } || function(d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
  };
  return function(d, b) {
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
}();

var CanvasView = function() {
  function CanvasView(canvas, width, height) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    this.theme = DarkTheme;
    this.reset();
  }
  CanvasView.prototype.reset = function() {
    this.ratio = window.devicePixelRatio || 1;
    this.canvas.width = this.width * this.ratio;
    this.canvas.height = this.height * this.ratio;
    this.canvas.style.width = this.width + "px";
    this.canvas.style.height = this.height + "px";
    this.ctx = this.canvas.getContext("2d");
  };
  // CanvasView.prototype.start = function() {
  //   var self = this;
  //   function tick() {
  //     self.update();
  //     self.render();
  //     requestAnimationFrame(tick);
  //   }
  //   requestAnimationFrame(tick);
  // };
  CanvasView.prototype.tick = function() {
    this.update();
    this.render();
  };
  CanvasView.prototype.update = function() {};
  CanvasView.prototype.render = function() {};
  return CanvasView;
}();
var FrequencyBins = function() {
  function FrequencyBins(analyzerNode, skip) {
    if (skip === void 0) {
      skip = 2;
    }
    this.analyzerNode = analyzerNode;
    this.skip = skip;
    var binCount = this.analyzerNode.frequencyBinCount;
    this.temp = new Float32Array(binCount);
    this.bins = new Float32Array(binCount - skip);
  }
  FrequencyBins.prototype.update = function() {
    this.analyzerNode.getFloatFrequencyData(this.temp);
    this.bins.set(this.temp.subarray(this.skip));
  };
  return FrequencyBins;
}();
var AnalyzerNodeView = function(_super) {
  __extends(AnalyzerNodeView, _super);
  function AnalyzerNodeView(analyzerNode, canvas, width, height) {
    var _this = _super.call(this, canvas, width, height) || this;
    _this.isRecording = false;
    _this.frequency = new FrequencyBins(analyzerNode);
    return _this;
  }
  return AnalyzerNodeView;
}(CanvasView);
var SpectogramAnalyzerNodeView = function(_super) {
  __extends(SpectogramAnalyzerNodeView, _super);
  function SpectogramAnalyzerNodeView(analyzerNode, canvas, width, height) {
    var _this = _super.call(this, analyzerNode, canvas, width, height) || this;
    _this.binWidth = 1;
    _this.binHPadding = 0;
    _this.binTotalWidth = _this.binWidth + _this.binHPadding;
    _this.tickHeight = 1;
    _this.tickVPadding = 0;
    _this.tickTotalHeight = _this.tickHeight + _this.tickVPadding;
    _this.reset();
    // _this.start();
    return _this;
  }
  SpectogramAnalyzerNodeView.prototype.reset = function() {
    _super.prototype.reset.call(this);
    this.tmpCanvas = document.createElement("canvas");
    this.tmpCanvas.width = this.canvas.width;
    this.tmpCanvas.height = this.canvas.height;
    this.tmpCtx = this.tmpCanvas.getContext("2d");
  };
  SpectogramAnalyzerNodeView.prototype.update = function() {
    this.frequency.update();
  };
  SpectogramAnalyzerNodeView.prototype.render = function() {
    var ctx = this.ctx;
    this.tmpCtx.drawImage(this.canvas, 0, 0, this.canvas.width, this.canvas.height);
    ctx.save();
    ctx.save();
    ctx.scale(this.ratio, this.ratio);
    ctx.fillStyle = this.theme.backgroundColor;
    ctx.fillRect(0, 0, this.width, this.height);
    var maxBinCount = this.width / this.binTotalWidth | 0;
    var binCount = Math.min(maxBinCount, this.frequency.bins.length);
    for (var i = 0; i < binCount; i++) {
      ctx.fillStyle = this.theme.scale(i / binCount);
      var value = clamp((this.frequency.bins[i] - MIN_DB_LEVEL) / DB_LEVEL_RANGE, 0, 1);
      ctx.globalAlpha = value * 2;
      ctx.fillRect(this.width - this.binTotalWidth, i * this.tickTotalHeight, this.binWidth, this.tickHeight);
    }
    ctx.restore();
    ctx.translate(-this.binTotalWidth, 0);
    ctx.drawImage(this.tmpCanvas, 0, 0);
    ctx.restore();
  };
  return SpectogramAnalyzerNodeView;
}(AnalyzerNodeView);




let microphoneIsWiredUp = false;
let microphoneAccessIsNotAllowed = undefined;
let uploadMicrophoneData = false;
let streamMicrophoneData = false;
let suppressNoise = false;
let addNoise = false;

let Module = null;
function getMicrophoneAccess() {
  if (microphoneIsWiredUp) {
    return;
  }
  var audioContext;
  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
  } catch (e) {
    alert('Web Audio API is not supported in this browser.');
  }

  // Check if there is microphone input.
  try {
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
  } catch (e) {
    alert("getUserMedia() is not supported in your browser.");
  }

  var inputBuffer = [];
  var outputBuffer = [];
  var bufferSize = 1024;
  var sampleRate = audioContext.sampleRate;
  var processingNode = audioContext.createScriptProcessor(bufferSize, 1, 1);

  var noiseNode = audioContext.createScriptProcessor(bufferSize, 1, 1);

  noiseNode.onaudioprocess = function (e) {
    var input = e.inputBuffer.getChannelData(0);
    var output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < input.length; i++) {
      if (addNoise) {
        output[i] = input[i] + (Math.random() / 100);  
      } else {
        output[i] = input[i];
      }
    }
  };

  function sineWaveAt(sampleNumber, tone) {
    var sampleFrequency = sampleRate / tone
    return Math.sin(sampleNumber / (sampleFrequency / (Math.PI * 2)))
  }

  function removeNoise(buffer) {
    let ptr = Module.ptr;
    let st = Module.st;
    for (let i = 0; i < 480; i++) {
      Module.HEAPF32[(ptr >> 2) + i] = buffer[i] * 32768;
    }
    for (let j = 0; j < 1; j++) {
      Module._rnnoise_process_frame(st, ptr, ptr);
    }
    console.log("Processed Buffer");
    for (let i = 0; i < 480; i++) {
      buffer[i] = Module.HEAPF32[(ptr >> 2) + i] / 32768;
    }
  }
  
  let frameBuffer = [];

  processingNode.onaudioprocess = function (e) {
    var input = e.inputBuffer.getChannelData(0);
    var output = e.outputBuffer.getChannelData(0);

    // Drain input buffer.
    for (let i = 0; i < bufferSize; i++) {
      inputBuffer.push(input[i]);
    }
    while (inputBuffer.length >= 480) {
      for (let i = 0; i < 480; i++) {
        frameBuffer[i] = inputBuffer.shift();
      }
      // Process Frame
      if (suppressNoise) removeNoise(frameBuffer);
      for (let i = 0; i < 480; i++) {
        outputBuffer.push(frameBuffer[i]);
      }
    }
    // Not enough data, exit early, etherwise the AnalyserNode returns NaNs.
    if (outputBuffer.length < bufferSize) {
      return;
    }
    // Flush output buffer.
    for (let i = 0; i < bufferSize; i++) {
      output[i] = outputBuffer.shift();
    }

    // {
    //   while (inputBuffer.length >= sampleRate) {
    //     let buffer = [];
    //     for (let i = 0; i < sampleRate; i++) {
    //       buffer.push(inputBuffer.shift())
    //     }
    //     if (uploadMicrophoneData) {
    //       postData(convertFloat32ToInt16(buffer).buffer);
    //     }
    //   }
    //   for (let i = 0; i < bufferSize; i++) {
    //     output[i] = 0;
    //   }
    // }
  }

  // Get access to the microphone and start pumping data through the graph.
  navigator.getUserMedia({ audio: true }, function (stream) {
    var microphone = audioContext.createMediaStreamSource(stream);
    var sourceAnalyserNode = audioContext.createAnalyser();
    var destinationAnalyserNode = audioContext.createAnalyser();
    sourceAnalyserNode.smoothingTimeConstant = 0;
    destinationAnalyserNode.smoothingTimeConstant = 0;

    sourceAnalyserNode.fftSize = 512;
    destinationAnalyserNode.fftSize = 512;

    microphone.connect(noiseNode);
    noiseNode.connect(sourceAnalyserNode);
    sourceAnalyserNode.connect(processingNode);
    processingNode.connect(destinationAnalyserNode);

    destinationAnalyserNode.connect(audioContext.destination);
    microphoneIsWiredUp = true;

    var sourceView = new SpectogramAnalyzerNodeView(sourceAnalyserNode, document.getElementById("source_spectrogram"), 876, 256);
    var destinationView = new SpectogramAnalyzerNodeView(destinationAnalyserNode, document.getElementById("destination_spectrogram"), 876, 256);

    function tick() {
      sourceView.tick();
      destinationView.tick();
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

  }, function (e) {
    if (e.name === "PermissionDeniedError") {
      microphoneAccessIsNotAllowed = true;
      alert("You'll need to provied access to your microphone for this web page to work.");
    }
  });
}

function convertFloat32ToInt16(buffer) {
  let l = buffer.length;
  let buf = new Int16Array(l);
  while (l--) {
    buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
  }
  return buf;
}

let uploadedPackets = 0;
function postData(arrayBuffer) {
  let streamingStatus = document.getElementById("streaming_status");
  var fd = new FormData();
  fd.append("author", "Fake Name");
  fd.append("attachment1", new Blob([arrayBuffer]));
  var xhr = new XMLHttpRequest();
  xhr.open("POST", "http://kyoko.thomasdaede.com:3001/upload");
  xhr.onload = function (event) {
    uploadedPackets++;
    streamingStatus.innerText = "Donated " + uploadedPackets + " seconds of noise (of 60).";
    if (uploadedPackets >= 60) {
      stopStreaming();
    }
  };
  xhr.send(fd);
}

function stopStreaming() {
  let streamingButton = document.getElementById("streaming_button");
  let streamingStatusIcon = document.getElementById("streaming_status_icon");
  let streamingStatus = document.getElementById("streaming_status");
  streamingStatusIcon.style.visibility = "hidden";
  uploadMicrophoneData = false;
  streamingButton.innerText = "Start donating a minute of noise!";
  uploadedPackets = 0;
  streamingStatus.innerText = "";
}

function startStreaming() {
  let streamingButton = document.getElementById("streaming_button");
  let streamingStatusIcon = document.getElementById("streaming_status_icon");
  streamingStatusIcon.style.visibility = "visible";
  uploadMicrophoneData = true;
  streamingButton.innerText = "Stop donating my noise!";
}

function toggleStreaming() {
  getMicrophoneAccess();
  
  if (uploadMicrophoneData) {
    stopStreaming();
  } else {
    startStreaming();
  }
}

function initializeNoiseSuppression() {
  if (Module) {
    return;
  }
  Module = {
    noExitRuntime: true,
    noInitialRun: true,
    preInit: [],
    preRun: [],
    postRun: [function () {
      console.log(`Loaded Javascript Module OK`);
    }],
    memoryInitializerPrefixURL: "bin/",
    arguments: ['input.ivf', 'output.raw']
  };
  NoiseModule(Module);
  Module.st = Module._rnnoise_create();
  Module.ptr = Module._malloc(480 * 4);

  // console.info(Module._rnnoise_process_frame);
}

function toggleNoise() {
  addNoise = !addNoise;
}

var selectedLiveNoiseSuppression = null;
function liveNoiseSuppression(type, item) {
  getMicrophoneAccess();
  initializeNoiseSuppression();
  if (type == 0) {
    stopNoiseSuppression();
  } else {
    startNoiseSuppression();
  }

  if (selectedLiveNoiseSuppression) selectedLiveNoiseSuppression.classList.remove("selected");
  selectedLiveNoiseSuppression = item;
  item.classList.add("selected");
}

var selectedLiveNoise = null;
function liveNoise(type, item) {
  addNoise = !!type;
  if (selectedLiveNoise) selectedLiveNoise.classList.remove("selected");
  selectedLiveNoise = item;
  item.classList.add("selected");
}

function stopNoiseSuppression() {
  // let streamingButton = document.getElementById("streaming_button");
  // let streamingStatusIcon = document.getElementById("streaming_status_icon");
  // let streamingStatus = document.getElementById("streaming_status");
  // streamingStatusIcon.style.visibility = "hidden";
  suppressNoise = false;
  // streamingButton.innerText = "Start donating a minute of noise!";
  // uploadedPackets = 0;
  // streamingStatus.innerText = "";
}

function startNoiseSuppression() {
  // let streamingButton = document.getElementById("streaming_button");
  // let streamingStatusIcon = document.getElementById("streaming_status_icon");
  // streamingStatusIcon.style.visibility = "visible";
  streamMicrophoneData = true;
  suppressNoise = true;
  // streamingButton.innerText = "Stop donating my noise!";
}

