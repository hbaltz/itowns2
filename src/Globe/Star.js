/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import NodeMesh from 'Renderer/NodeMesh';
import StarGeometry from 'Renderer/ThreeExtended/StarGeometry';
import * as THREE from 'three';


const Star = function Star() {
    NodeMesh.call(this);

    var geom = new StarGeometry();

    var particles = new THREE.Points(geom, new THREE.PointsMaterial({
        color: 0xAAAACC,
    }));
    this.add(particles);
};

Star.prototype = Object.create(NodeMesh.prototype);

Star.prototype.constructor = Star;


export default Star;
