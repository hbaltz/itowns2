/**
 * Generated On: 2015-10-5
 * Class: c3DEngine
 * Description: 3DEngine est l'interface avec le framework webGL.
 */

/* global Uint8Array, Float64Array, document, window, Image */

import * as THREE from 'three';
import GlobeControls from 'Renderer/ThreeExtented/GlobeControls';
import Camera from 'Renderer/Camera';
import Atmosphere from 'Globe/Atmosphere';
import Capabilities from 'Core/System/Capabilities';
import RendererConstant from 'Renderer/RendererConstant';

var instance3DEngine = null;
var bufferNeedUpdate = [];
bufferNeedUpdate[RendererConstant.DEPTH] = true;
bufferNeedUpdate[RendererConstant.ID] = true;

function c3DEngine(scene, positionCamera, viewerDiv, debugMode, gLDebug) {
    // Constructor

    if (instance3DEngine !== null) {
        throw new Error('Cannot instantiate more than one c3DEngine');
    }

    var caps = new Capabilities();
    var NOIE = !caps.isInternetExplorer();
    this.gLDebug = gLDebug;
    this.viewerDiv = viewerDiv;
    this.debug = debugMode;
    this.scene3D = new THREE.Scene();
    this.width = this.debug ? viewerDiv.clientWidth * 0.5 : viewerDiv.clientWidth;
    this.height = viewerDiv.clientHeight;
    this.camDebug = undefined;
    this.dnear = 0.0;
    this.dfar = 0.0;
    this.stateRender = RendererConstant.FINAL;
    this.positionBuffer = null;
    this.lightingOn = false;

    this.camera = new Camera(this.width, this.height, this.debug);

    if (this.debug) {
        this.camDebug = new THREE.PerspectiveCamera(30, this.camera.ratio);
    }

    // TODO: verify if this.pickingTexture is used
    this.pixelBuffer = [];
    this.pixelBuffer[RendererConstant.DEPTH] = new Uint8Array(this.width * this.height * 4);
    this.pixelBuffer[RendererConstant.ID] = new Uint8Array(this.width * this.height * 4);

    this.pickingTexture = new THREE.WebGLRenderTarget(this.width, this.height);
    this.pickingTexture.texture.minFilter = THREE.LinearFilter;
    this.pickingTexture.texture.generateMipmaps = false;
    this.pickingTexture.depthBuffer = false;

    this.renderScene = function renderScene() {
        if (this.camera.camHelper())
            { this.camera.camHelper().visible = false; }

        this.renderer.clear();
        this.renderer.setViewport(0, 0, this.width, this.height);
        this.renderer.render(this.scene3D, this.camera.camera3D);

        if (this.debug) {
            this.enableRTC(false);
            this.camera.camHelper().visible = true;

            var target = this.controls.moveTarget();
            var position = this.camera.position();
            var posDebug = new THREE.Vector3().subVectors(position, target);

            posDebug.setLength(posDebug.length() * 2.0);
            posDebug.add(target);
            posDebug.setLength((posDebug.length() - this.size) * 3.0 + this.size);

            this.camDebug.position.copy(posDebug);
            this.camDebug.lookAt(target);
            this.camDebug.translateX(posDebug.length() / 2);
            this.camDebug.lookAt(target);
            this.renderer.setViewport(this.width, 0, this.width, this.height);
            this.renderer.render(this.scene3D, this.camDebug);

            this.enableRTC(true);
            this.camera.camHelper().visible = false;
        }
    }.bind(this);

    this.update = function update() {
        this.camera.update();
        this.updateControl();
        this.scene.notifyChange(0, true);
    }.bind(this);

    this.onWindowResize = function onWindowResize() {
        this.width = this.viewerDiv.clientWidth * (this.debug ? 0.5 : 1);
        this.height = this.viewerDiv.clientHeight;
        this.camera.resize(this.width, this.height);
        this.controls.updateCamera(this.camera);

        if (this.camDebug) {
            this.camDebug.aspect = this.camera.ratio;
            this.camDebug.updateProjectionMatrix();
        }

        this.pickingTexture.setSize(this.width, this.height);
        this.renderer.setSize(this.viewerDiv.clientWidth, this.height);
        this.update();
    }.bind(this);

    this.scene = scene;
    this.size = this.scene.size().x;

    //
    // init camera
    //
    this.camera.setPosition(positionCamera);
    this.camera.camera3D.near = this.size * 2.333; // if near is too small --> bug no camera helper
    this.camera.camera3D.far = this.size * 10;
    this.camera.camera3D.updateProjectionMatrix();
    this.camera.camera3D.updateMatrixWorld(true);

    if (this.debug) {
        this.camDebug.position.x = this.size * 6;
        this.camDebug.lookAt(new THREE.Vector3(0, 0, 0));
        this.camDebug.near = this.size * 0.1;
        this.camDebug.far = this.size * 10;
        this.camDebug.updateProjectionMatrix();
        this.camera.createCamHelper();
        this.scene3D.add(this.camera.camHelper());
        var axisHelper = new THREE.AxisHelper(this.size * 1.33);
        this.scene3D.add(axisHelper);
    }

    this.camera.camera3D.near = Math.max(15.0, 0.000002352 * this.size);
    this.camera.camera3D.updateProjectionMatrix();

    //
    // Create canvas
    //

    var canvas = document.createElement('canvas');
    canvas.id = 'canvasWebGL';

    //
    // Create renderer
    //

    this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        logarithmicDepthBuffer: this.gLDebug || NOIE,
    });
    this.renderer.setPixelRatio(viewerDiv.devicePixelRatio);
    this.renderer.setSize(viewerDiv.clientWidth, viewerDiv.clientHeight);
    this.renderer.setClearColor(0x030508);
    this.renderer.autoClear = false;

    // this.viewerDiv.appendChild(canvas);
    viewerDiv.appendChild(this.renderer.domElement);

    //
    // Create Control
    //
    this.controls = new GlobeControls(this.camera.camera3D, this.renderer.domElement, this);
    this.controls.rotateSpeed = 0.25;
    this.controls.zoomSpeed = 2.0;
    this.controls.minDistance = 30;
    this.controls.maxDistance = this.size * 8.0;

    var gl = this.renderer.context;
    var maxTexturesUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);

    var debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo !== null) {
        var vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);

        if (vendor.indexOf('mesa') > -1 || vendor.indexOf('Mesa') > -1)
            { maxTexturesUnits = Math.min(16, maxTexturesUnits); }
    } else {
        maxTexturesUnits = Math.min(16, maxTexturesUnits);
    }

    this.glParams = {
        maxTexturesUnits,
    };

    window.addEventListener('resize', this.onWindowResize, false);

    var allBuffersNeedUpdate = function allBuffersNeedUpdate() {
        bufferNeedUpdate[RendererConstant.DEPTH] = true;
        bufferNeedUpdate[RendererConstant.ID] = true;
    };

    this.controls.addEventListener('change', () => {
        if (this.controls.getState() === -1) allBuffersNeedUpdate();
        this.update();
    }, false);

    // select
    this.renderer.domElement.addEventListener('selectClick', (event) => {
        this.selectNodeAt(event.mouse);
        this.update();
    }, false);

    this.renderer.domElement.addEventListener('mouseup', () => {
        allBuffersNeedUpdate();
    }, false);
}

/**
 * TODO : temporaire
 * update control parameter in function of distance of globe
 * @returns {undefined}
 */
c3DEngine.prototype.updateControl = function updateControl() {
    var len = this.camera.position().length();
    var lim = this.size * 1.1;

    if (len < lim) {
        var t = Math.pow(Math.cos((lim - len) / (lim - this.size * 0.9981) * Math.PI * 0.5), 1.5);
        var color = new THREE.Color(0x93d5f8);
        this.renderer.setClearColor(color.multiplyScalar(1.0 - t));
    } else if (len >= lim)
        { this.renderer.setClearColor(0x030508); }
};

c3DEngine.prototype.enableRTC = function enableRTC(enable) {
    for (var x = 0; x < this.scene3D.children.length; x++) {
        var node = this.scene3D.children[x];

        if (node instanceof Atmosphere)
            { node.visible = enable; }
        else if (node.enableRTC)
          { node.traverseVisible(enable ? this.rtcOn.bind(this) : this.rtcOff.bind(this)); }
    }
};

/**
 * change state all visible nodes
 * @param {type} state new state to apply
 * @returns {undefined}
 */
c3DEngine.prototype.changeStateNodesScene = function changeStateNodesScene(state) {
    // build traverse function
    var changeStateFunction = (function getChangeStateFunctionFn() {
        return function changeStateFunction(object3D) {
            object3D.changeState(state);
        };
    }());

    var enable = state === RendererConstant.FINAL;

    for (var x = 0; x < this.scene3D.children.length; x++) {
        var node = this.scene3D.children[x];

        if (node.changeState) {
            node.traverseVisible(changeStateFunction);
        } else if (node.layer) {
            node.visible = enable ? node.layer.visible : false;
        }
    }
};

c3DEngine.prototype.rtcOn = function rtcOn(obj3D) {
    obj3D.enableRTC(true);
    obj3D.matrixAutoUpdate = false;
};

c3DEngine.prototype.rtcOff = function rtcOff(obj3D) {
    obj3D.enableRTC(false);
    obj3D.matrixWorldNeedsUpdate = true;
    obj3D.matrixAutoUpdate = true;
};

/**
 */
c3DEngine.prototype.style2Engine = function style2Engine() {
    // TODO: Implement Me

};

/**
 * TODO : to delete
 * @param {type} mesh
 * @param {type} texture
 * @returns {undefined}
 */
c3DEngine.prototype.setTexture = function setTexture(mesh, texture) {
    // TODO: Implement Me
    mesh.material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: texture,
    });
};

/**
 * add nodeMesh in scene 3D
 * @param {type} node
 * @returns {undefined}
 */
c3DEngine.prototype.add3DScene = function add3DScene(node) {
    if (Array.isArray(node))

        { this.scene3D.add.apply(this.scene3D, node); }

    else

        { this.scene3D.add(node); }
};


c3DEngine.prototype.removeAll = function removeAll() {
    this.scene3D.children = [];
};

/**
 */
c3DEngine.prototype.precision = function precision() {
    // TODO: Implement Me

};

/*
 * return
 */
c3DEngine.prototype.getWindowSize = function getWindowSize() {
    return new THREE.Vector2(this.width, this.height);
};

/**
 * return renderer THREE.js
 * @returns {undefined|c3DEngine_L7.THREE.WebGLRenderer}
 */
c3DEngine.prototype.getRenderer = function getRenderer() {
    return this.renderer;
};

c3DEngine.prototype.setStateRender = function setStateRender(stateRender) {
    if (this.stateRender !== stateRender) {
        this.stateRender = stateRender;

        this.changeStateNodesScene(stateRender);
    }
};
c3DEngine.prototype.readTobuffer = function readTobuffer(x, y, width, height, mode) {
    const id = y * this.width + x;
    const pix = this.pixelBuffer[mode].slice(id * 4, id * 4 + 4);
    return pix;
};

c3DEngine.prototype.renderTobuffer = function renderTobuffer(x, y, width, height, mode) {
    const resized = this.pixelBuffer[mode].length !== this.width * this.height * 4;
    if (!bufferNeedUpdate[mode] && !resized) return;
    const originalState = this.stateRender;
    this.setStateRender(mode);
    this.renderer.clear();
    this.renderer.setViewport(0, 0, this.width, this.height);
    this.renderer.render(this.scene3D, this.camera.camera3D, this.pickingTexture);
    this.setStateRender(originalState);
    if (resized) {
        this.pixelBuffer[mode] = new Uint8Array(this.width * this.height * 4);
    }
    this.renderer.readRenderTargetPixels(this.pickingTexture, 0, 0, this.width, this.height, this.pixelBuffer[mode]);
    this.scene.renderScene3D();
    bufferNeedUpdate[mode] = false;
};

c3DEngine.prototype.bufferToImage = function bufferToImage(pixelBuffer, width, height) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');

    // size the canvas to your desired image
    canvas.width = width;
    canvas.height = height;

    var imgData = ctx.getImageData(0, 0, width, height);
    imgData.data.set(pixelBuffer);

    ctx.putImageData(imgData, 0, 0);

    // create a new img object
    var image = new Image();

    // set the img.src to the canvas data url
    image.src = canvas.toDataURL();

    return image;
};

const bitSh = new THREE.Vector4(1.0 / (256.0 * 256.0 * 256.0), 1.0 / (256.0 * 256.0), 1.0 / 256.0, 1.0);

var unpack1K = function unpack1K(color, factor) {
    return bitSh.dot(color) * factor;
};

/**
 *
 * @param {Vecto2D} mouse : mouse position on screen in pixel
 * @returns {int} uuid's node
 * */
c3DEngine.prototype.screenCoordsToNodeId = function screenCoordsToNodeId(mouse) {
    var camera = this.camera.camera3D;

    camera.updateMatrixWorld();

    this.renderTobuffer(mouse.x, this.height - mouse.y, 1, 1, RendererConstant.ID);

    var buffer = this.readTobuffer(mouse.x, this.height - mouse.y, 1, 1, RendererConstant.ID);

    var depthRGBA = new THREE.Vector4().fromArray(buffer).divideScalar(255.0);

    // unpack RGBA to float
    var unpack = unpack1K(depthRGBA, 10000);

    return Math.round(unpack);
};

/**
 *
 * @param {Vecto2D} mouse : mouse position on screen in pixel
 * Select node under mouse
 **/
c3DEngine.prototype.selectNodeAt = function selectNodeAt(mouse) {
    this.scene.selectNodeId(this.screenCoordsToNodeId(mouse));
};

c3DEngine.prototype.getPickingPositionFromDepth = (function getGetPickingPosFromDepthFn() {
    var matrix = new THREE.Matrix4();
    matrix.elements = new Float64Array(16); // /!\ WARNING Matrix JS are in Float32Array
    var screen = new THREE.Vector2();
    var pickWorldPosition = new THREE.Vector3();
    var ray = new THREE.Ray();
    var direction = new THREE.Vector3();
    var depthRGBA = new THREE.Vector4();

    return function getPickingPositionFromDepth(mouse) {
        if (mouse === undefined)
            { mouse = new THREE.Vector2(Math.floor(this.width / 2), Math.floor(this.height / 2)); }

        var camera = this.camera.camera3D;

        camera.updateMatrixWorld();

        this.renderTobuffer(mouse.x, this.height - mouse.y, 1, 1, RendererConstant.DEPTH);

        var buffer = this.readTobuffer(mouse.x, this.height - mouse.y, 1, 1, RendererConstant.DEPTH);

        screen.x = ((mouse.x) / this.width) * 2 - 1;
        screen.y = -((mouse.y) / this.height) * 2 + 1;

        camera.matrixWorld.setPosition(camera.position);

        // Origin
        ray.origin.copy(camera.position);

        // Direction
        ray.direction.set(screen.x, screen.y, 0.5);
        // Unproject
        matrix.multiplyMatrices(camera.matrixWorld, matrix.getInverse(camera.projectionMatrix));
        ray.direction.applyProjection(matrix);
        ray.direction.sub(ray.origin);

        direction.set(0, 0, 1.0);
        direction.applyProjection(matrix);
        direction.sub(ray.origin);

        var angle = direction.angleTo(ray.direction);

        depthRGBA.fromArray(buffer).divideScalar(255.0);

        var depth = unpack1K(depthRGBA, 100000000.0) / Math.cos(angle);

        pickWorldPosition.addVectors(camera.position, ray.direction.setLength(depth));

        if (pickWorldPosition.length() > 10000000)
            { return undefined; }

        return pickWorldPosition;
    };
}());

c3DEngine.prototype.placeDummy = function placeDummy(dummy, position) {
    dummy.position.copy(position);
    var size = position.clone().sub(this.camera.position()).length() / 200; // TODO distance
    dummy.scale.copy(new THREE.Vector3(size, size, size));
    dummy.lookAt(new THREE.Vector3());
    dummy.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2));
    dummy.translateY(size);
    dummy.updateMatrix();
    dummy.updateMatrixWorld();
};

c3DEngine.prototype.getRTCMatrixFromCenter = (function getRTCMatrixFromCenterFn() {
    const position = new THREE.Vector3();
    const matrix = new THREE.Matrix4();
    return function getRTCMatrixFromCenter(center, camera) {
        position.subVectors(camera.camera3D.position, center);
        matrix.copy(camera.camera3D.matrixWorld);
        matrix.setPosition(position);
        matrix.getInverse(matrix);
        return new THREE.Matrix4().multiplyMatrices(camera.camera3D.projectionMatrix, matrix);
    };
}());

c3DEngine.prototype.getRTCMatrixFromNode = function getRTCMatrixFromNode(node, camera) {
    // TODO: Simplify this function like getRTCMatrixFromCenter()
    var camera3D = camera.camera3D;
    var positionWorld = new THREE.Vector3().setFromMatrixPosition(node.matrixWorld);
    var position = new THREE.Vector3().subVectors(camera3D.position, positionWorld);
    var quaternion = new THREE.Quaternion().copy(camera3D.quaternion);
    var matrix = new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1, 1, 1));
    var matrixInv = new THREE.Matrix4().getInverse(matrix);
    var model = node.matrixWorld.clone().setPosition(new THREE.Vector3());
    matrixInv.multiply(model);

    var centerEye = new THREE.Vector4().applyMatrix4(matrixInv);
    var mvc = matrixInv.setPosition(centerEye);
    return new THREE.Matrix4().multiplyMatrices(camera3D.projectionMatrix, mvc);
};

c3DEngine.prototype.setLightingOn = function setLightingOn(value) {
    this.lightingOn = value;
};


const mouse = new THREE.Vector2();
// Picking in tree 'root' from screenCoords
c3DEngine.prototype.getPickObject3d = function getPickObject3d(screenCoords, root) {
    // calculate mouse screenCoords in normalized device coordinates
    // (-1 to +1) for both components
    mouse.x = (screenCoords.x / window.innerWidth) * 2 - 1;
    mouse.y = -(screenCoords.y / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    const camera = this.camera.camera3D;
    raycaster.setFromCamera(mouse, camera);

    // calculate objects intersecting the picking ray
    return raycaster.intersectObjects(root, true);
};

export default function (scene, positionCamera, viewerDiv, debugMode, gLDebug) {
    instance3DEngine = instance3DEngine || new c3DEngine(scene, positionCamera, viewerDiv, debugMode, gLDebug);
    return instance3DEngine;
}
