const { Controller, UI } = window.MINDAR.IMAGE;

AFRAME.registerSystem('mindar-image-system', {
  container: null,
  video: null,
  processingImage: false,

  init: function () {
    this.anchorEntities = [];
  },

  tick: function () {
  },

  setup: function ({ imageTargetSrc, maxTrack, showStats, uiLoading, uiScanning, uiError, missTolerance, warmupTolerance, interpolationFactor }) {
    this.imageTargetSrc = imageTargetSrc;
    this.maxTrack = maxTrack;
    this.interpolationFactor = interpolationFactor;
    this.missTolerance = missTolerance;
    this.warmupTolerance = warmupTolerance;
    this.showStats = showStats;
    this.ui = new UI({uiLoading, uiScanning, uiError});
  },

  registerAnchor: function (el, targetIndex) {
    this.anchorEntities.push({ el: el, targetIndex: targetIndex });
  },

  start: function () {
    this.container = this.el.sceneEl.parentNode; // alert("version 3");

    if (this.showStats) {
      this.mainStats = new Stats();
      this.mainStats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
      this.mainStats.domElement.style.cssText = 'position:absolute;top:0px;left:0px;z-index:999';
      this.container.appendChild(this.mainStats.domElement);
    }

    this.ui.showLoading();
    this._startVideo();// alert("aframe 40");
  },

  switchTarget: function (targetIndex) {
    this.controller.interestedTargetIndex = targetIndex;
  },

  stop: function () {
    this.pause();
    const tracks = this.video.srcObject.getTracks();
    tracks.forEach(function (track) {
      track.stop();
    });
    this.video.remove();
  },

  pause: function (keepVideo = false) {
    if (!keepVideo) {
      this.video.pause();
    }
    this.controller.stopProcessVideo();
  },

  unpause: function () {
    this.video.play();
    this.controller.processVideo(this.video);
  },

  _startVideo: function () {
    this.video = document.createElement('video');   // alert("aframe 69");
    this.video.id = 'video1'
    // alert(this.video);
    this.video.setAttribute('autoplay', '');
    this.video.setAttribute('muted', '');
    this.video.setAttribute('playsinline', '');
    this.video.style.position = 'absolute'
    this.video.style.top = '0px'
    this.video.style.left = '0px'
    this.video.style.zIndex = '-2'
    this.container.appendChild(this.video);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // TODO: show unsupported error
      this.el.emit("arError", { error: 'VIDEO_FAIL' });       // alert("aframe 82");
      this.ui.showCompatibility();
      return;
    } // alert("aframe 85");

    function getUserMedia(constraints, success, error) {
      if (navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia(constraints).then(success).catch(error);
      } else if (navigator.webkitGetUserMedia) {
          navigator.webkitGetUserMedia(constraints, success, error)
      } else if (navigator.mozGetUserMedia) {
          navigator.mozGetUserMedia(constraints, success, error);
      } else if (navigator.getUserMedia) {
          navigator.getUserMedia(constraints, success, error);
      }
    }

    function error(error) {
        console.log(`访问用户媒体设备失败${error.name}, ${error.message}`);
    }

    if (navigator.mediaDevices.getUserMedia || navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia) {
      //调用用户媒体设备, 访问摄像头
      var that = this;
      getUserMedia({audio: false, video: {facingMode: 'environment' } }, 
         (stream) => {
          //兼容webkit核心浏览器
          let CompatibleURL = window.URL || window.webkitURL; // alert("aframe 110");
          //将视频流设置为video元素的源
          try {
            console.log(stream);// alert(stream);
            let tempVedio = document.getElementById('video1');
            // alert("tempVedio is "+tempVedio);
      
            tempVedio.srcObject = stream;
            // this.video.src = CompatibleURL.createObjectURL(stream);// alert("aframe 105");
            // alert("aframe 82");
            tempVedio.setAttribute('width', tempVedio.videoWidth);
            tempVedio.setAttribute('height', tempVedio.videoHeight);
            tempVedio.play();// alert("aframe 123 ");
          }catch (error) {
            // alert(error);
            tempVedio.src = window.URL.createObjectURL(stream);
          }
          //that._startAR(); // alert("aframe 129");
      }, 
      error); // alert("aframe 119");
      this.video.addEventListener('loadedmetadata', () => {        // alert("aframe 92");
        //console.log("video ready...", this.video);
        this.video.setAttribute('width', this.video.videoWidth);
        this.video.setAttribute('height', this.video.videoHeight);
        this._startAR(); // alert("aframe 95");
      });

    } else {
        // alert('不支持访问用户媒体');
    }

    // navigator.mediaDevices.getUserMedia({
    //   audio: false, video: {
    //     facingMode: 'environment',
    //   }
    // }).then((stream) => {// alert("aframe 91");
    //   this.video.srcObject = stream;
    //   this.video.addEventListener('loadedmetadata', () => {        // alert("aframe 92");
    //     //console.log("video ready...", this.video);
    //     this.video.setAttribute('width', this.video.videoWidth);
    //     this.video.setAttribute('height', this.video.videoHeight);
    //     this._startAR(); // alert("aframe 95");
    //   });
    // }).catch((err) => {
    //   // alert("aframe 100");
    //   // alert(err);
    //   console.log("getUserMedia error", err);
    //   this.el.emit("arError", { error: 'VIDEO_FAIL' });
    // });
  },

  _startAR: async function () {
    const video = this.video;
    const container = this.container;

    this.controller = new Controller({
      inputWidth: video.videoWidth,
      inputHeight: video.videoHeight,
      maxTrack: this.maxTrack,
      interpolationFactor: this.interpolationFactor,
      missTolerance: this.missTolerance,
      warmupTolerance: this.warmupTolerance,
      onUpdate: (data) => {
        if (data.type === 'processDone') {
          if (this.mainStats) this.mainStats.update();
        }
        else if (data.type === 'updateMatrix') {
          const { targetIndex, worldMatrix } = data;

          for (let i = 0; i < this.anchorEntities.length; i++) {
            if (this.anchorEntities[i].targetIndex === targetIndex) {
              this.anchorEntities[i].el.updateWorldMatrix(worldMatrix,);
              if (worldMatrix) {
                this.ui.hideScanning();
              }
            }
          }
        }
      }
    });

    this._resize();
    window.addEventListener('resize', this._resize.bind(this)); // alert("aframe 136");

    const { dimensions: imageTargetDimensions } = await this.controller.addImageTargets(this.imageTargetSrc); // alert("aframe 138");

    for (let i = 0; i < this.anchorEntities.length; i++) {
      const { el, targetIndex } = this.anchorEntities[i];
      if (targetIndex < imageTargetDimensions.length) {
        el.setupMarker(imageTargetDimensions[targetIndex]);
      }
    }

    await this.controller.dummyRun(this.video);       // alert("aframe 147");
    this.el.emit("arReady");
    this.ui.hideLoading();
    this.ui.showScanning();

    this.controller.processVideo(this.video);      // alert("aframe 152");
  },

  _resize: function () {
    const video = this.video;
    const container = this.container;

    let vw, vh; // display css width, height
    const videoRatio = video.videoWidth / video.videoHeight;
    const containerRatio = container.clientWidth / container.clientHeight;
    if (videoRatio > containerRatio) {
      vh = container.clientHeight;
      vw = vh * videoRatio;
    } else {
      vw = container.clientWidth;
      vh = vw / videoRatio;
    }

    const proj = this.controller.getProjectionMatrix();
    const fov = 2 * Math.atan(1 / proj[5] / vh * container.clientHeight) * 180 / Math.PI; // vertical fov
    const near = proj[14] / (proj[10] - 1.0);
    const far = proj[14] / (proj[10] + 1.0);
    const ratio = proj[5] / proj[0]; // (r-l) / (t-b)
    //console.log("loaded proj: ", proj, ". fov: ", fov, ". near: ", near, ". far: ", far, ". ratio: ", ratio);
    const newAspect = container.clientWidth / container.clientHeight;
    const cameraEle = container.getElementsByTagName("a-camera")[0];
    const camera = cameraEle.getObject3D('camera');
    camera.fov = fov;
    camera.aspect = newAspect;
    camera.near = near;
    camera.far = far;
    camera.updateProjectionMatrix();
    //const newCam = new AFRAME.THREE.PerspectiveCamera(fov, newRatio, near, far);
    //camera.getObject3D('camera').projectionMatrix = newCam.projectionMatrix;

    this.video.style.top = (-(vh - container.clientHeight) / 2) + "px";
    this.video.style.left = (-(vw - container.clientWidth) / 2) + "px";
    this.video.style.width = vw + "px";
    this.video.style.height = vh + "px";
  }
});

AFRAME.registerComponent('mindar-image', {
  dependencies: ['mindar-image-system'],

  schema: {
    imageTargetSrc: { type: 'string' },
    maxTrack: { type: 'int', default: 1 },
    interpolationFactor: { type: 'int', default: -1 },
    missTolerance: { type: 'int', default: -1 },
    warmupTolerance: { type: 'int', default: -1 },
    showStats: { type: 'boolean', default: false },
    autoStart: { type: 'boolean', default: true },
    uiLoading: { type: 'string', default: 'yes' },
    uiScanning: { type: 'string', default: 'yes' },
    uiError: { type: 'string', default: 'yes' },
  },

  init: function () {
    const arSystem = this.el.sceneEl.systems['mindar-image-system'];

    arSystem.setup({
      imageTargetSrc: this.data.imageTargetSrc,
      maxTrack: this.data.maxTrack,
      interpolationFactor: this.data.interpolationFactor === -1 ? null : this.data.interpolationFactor,
      missTolerance: this.data.missTolerance === -1 ? null : this.data.missTolerance,
      warmupTolerance: this.data.warmupTolerance === -1 ? null : this.data.warmupTolerance,
      showStats: this.data.showStats,
      uiLoading: this.data.uiLoading,
      uiScanning: this.data.uiScanning,
      uiError: this.data.uiError,
    });
    if (this.data.autoStart) {
      this.el.sceneEl.addEventListener('renderstart', () => {
        arSystem.start();
      });
    }
  }
});

AFRAME.registerComponent('mindar-image-target', {
  dependencies: ['mindar-image-system'],

  schema: {
    targetIndex: { type: 'number' },
  },

  postMatrix: null, // rescale the anchor to make width of 1 unit = physical width of card

  init: function () {
    const arSystem = this.el.sceneEl.systems['mindar-image-system'];
    arSystem.registerAnchor(this, this.data.targetIndex);

    const root = this.el.object3D;
    root.visible = false;
    root.matrixAutoUpdate = false;
  },

  setupMarker([markerWidth, markerHeight]) {
    const position = new AFRAME.THREE.Vector3();
    const quaternion = new AFRAME.THREE.Quaternion();
    const scale = new AFRAME.THREE.Vector3();
    position.x = markerWidth / 2;
    position.y = markerWidth / 2 + (markerHeight - markerWidth) / 2;
    scale.x = markerWidth;
    scale.y = markerWidth;
    scale.z = markerWidth;
    this.postMatrix = new AFRAME.THREE.Matrix4();
    this.postMatrix.compose(position, quaternion, scale);
  },

  updateWorldMatrix(worldMatrix) {
    if (!this.el.object3D.visible && worldMatrix !== null) {
      this.el.emit("targetFound");
    } else if (this.el.object3D.visible && worldMatrix === null) {
      this.el.emit("targetLost");
    }

    this.el.object3D.visible = worldMatrix !== null;
    if (worldMatrix === null) {
      return;
    }
    var m = new AFRAME.THREE.Matrix4();
    m.elements = worldMatrix;
    m.multiply(this.postMatrix);
    this.el.object3D.matrix = m;
  }
});
