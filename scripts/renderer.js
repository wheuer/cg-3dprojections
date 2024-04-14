import * as CG from './transforms.js';
import { Matrix, Vector } from "./matrix.js";
import { Vector3 } from "./transforms.js";

const LEFT   = 32; // binary 100000
const RIGHT  = 16; // binary 010000
const BOTTOM = 8;  // binary 001000
const TOP    = 4;  // binary 000100
const FAR    = 2;  // binary 000010
const NEAR   = 1;  // binary 000001
const FLOAT_EPSILON = 0.000001;

class Renderer {
    // canvas:              object ({id: __, width: __, height: __})
    // scene:               object (...see description on Canvas)
    constructor(canvas, scene) {
        this.canvas = document.getElementById(canvas.id);
        this.canvas.width = canvas.width;
        this.canvas.height = canvas.height;
        this.ctx = this.canvas.getContext('2d');
        this.scene = this.processScene(scene);
        this.enable_animation = true;  // <-- disabled for easier debugging; enable for animation
        this.start_time = null;
        this.prev_time = null;
    }

    // Animations
    updateTransforms(time, delta_time) {
        // TODO: update any transformations needed for animation
    }

    // 
    rotateLeft() {
        // Calculate uvn
        let prp = this.scene.view.prp;
        let srp = this.scene.view.srp;
        let vup = this.scene.view.vup;
        let vrcn = prp.subtract(srp);
        vrcn.normalize();
        let vrcu = vup.cross(vrcn);
        vrcu.normalize()
        let vrcv = vrcn.cross(vrcu);

        // Translate PRP to origin
        let translateForward = new Matrix(4, 4);
        CG.mat4x4Translate(translateForward, -prp.x, -prp.y, -prp.z);

        // Rotate v-axis about the y-axis to align with the y-z plane if not already aligned (cannot have divide by zero)
        let rotateVYForward = new Matrix(4, 4);
        if (vrcv.z != 0) {
            CG.mat4x4RotateY(rotateVYForward, -Math.atan(vrcv.x / vrcv.z));
        } else {
            CG.mat4x4Identity(rotateVYForward);
        }

        // Rotate v-axis about the x-axis to align with the z-axis
        let rotateVXForward = new Matrix(4, 4);
        CG.mat4x4RotateX(rotateVXForward, Math.atan(vrcv.y / Math.sqrt(vrcv.x**2 + vrcv.z**2)));

        // Do desired rotation now with v-axis and z-axis aligned
        let rotate = new Matrix(4, 4);
        CG.mat4x4RotateZ(rotate, 2*0.0174533); // X degrees each press

        // Rotate back v-axis about the x-axis
        let rotateVXBackward = new Matrix(4, 4);
        CG.mat4x4RotateX(rotateVXBackward, -Math.atan(vrcv.y / Math.sqrt(vrcv.x**2 + vrcv.z**2)));

        // Rotate back v-axis about the y-axis if required
        let rotateVYBackward = new Matrix(4, 4);
        if (vrcv.z != 0) {
            CG.mat4x4RotateY(rotateVYBackward, Math.atan(vrcv.x / vrcv.z));
        } else {
            CG.mat4x4Identity(rotateVYBackward);
        }

        // Translate PRP to origin
        let translateBackward = new Matrix(4, 4);
        CG.mat4x4Translate(translateBackward, prp.x, prp.y, prp.z);

        // Combine into one matrix 
        let totalMatrix = Matrix.multiply([translateBackward, rotateVYBackward, rotateVXBackward, rotate, rotateVXForward, rotateVYForward, translateForward]);

        // Apply matrix to srp
        let homogeneousSRP = CG.Vector4(srp.x, srp.y, srp.z, 1);
        homogeneousSRP = Matrix.multiply([totalMatrix, homogeneousSRP]);
        this.scene.view.srp = CG.Vector3(homogeneousSRP.x, homogeneousSRP.y, homogeneousSRP.z);
        console.log(this.scene.view.srp.values);
    }
    
    //
    rotateRight() {
        // Calculate uvn
        let prp = this.scene.view.prp;
        let srp = this.scene.view.srp;
        let vup = this.scene.view.vup;
        let vrcn = prp.subtract(srp);
        vrcn.normalize();
        let vrcu = vup.cross(vrcn);
        vrcu.normalize()
        let vrcv = vrcn.cross(vrcu);

        // Translate PRP to origin
        let translateForward = new Matrix(4, 4);
        CG.mat4x4Translate(translateForward, -prp.x, -prp.y, -prp.z);

        // Rotate v-axis about the y-axis to align with the y-z plane if not already aligned (cannot have divide by zero)
        let rotateVYForward = new Matrix(4, 4);
        if (vrcv.z != 0) {
            CG.mat4x4RotateY(rotateVYForward, -Math.atan(vrcv.x / vrcv.z));
        } else {
            CG.mat4x4Identity(rotateVYForward);
        }

        // Rotate v-axis about the x-axis to align with the z-axis, if its already aligned it will just rotate zero
        let rotateVXForward = new Matrix(4, 4);
        CG.mat4x4RotateX(rotateVXForward, Math.atan(vrcv.y / Math.sqrt(vrcv.x**2 + vrcv.z**2)));

        // Do desired rotation now with v-axis and z-axis aligned
        let rotate = new Matrix(4, 4);
        CG.mat4x4RotateZ(rotate, -2*0.0174533); // X degrees each press

        // Rotate back v-axis about the x-axis
        let rotateVXBackward = new Matrix(4, 4);
        CG.mat4x4RotateX(rotateVXBackward, -Math.atan(vrcv.y / Math.sqrt(vrcv.x**2 + vrcv.z**2)));

        // Rotate back v-axis about the y-axis if required
        let rotateVYBackward = new Matrix(4, 4);
        if (vrcv.z != 0) {
            CG.mat4x4RotateY(rotateVYBackward, Math.atan(vrcv.x / vrcv.z));
        } else {
            CG.mat4x4Identity(rotateVYBackward);
        }

        // Translate PRP to origin
        let translateBackward = new Matrix(4, 4);
        CG.mat4x4Translate(translateBackward, prp.x, prp.y, prp.z);

        // Combine into one matrix 
        let totalMatrix = Matrix.multiply([translateBackward, rotateVYBackward, rotateVXBackward, rotate, rotateVXForward, rotateVYForward, translateForward]);
        
        // Apply matrix to srp
        let homogeneousSRP = CG.Vector4(srp.x, srp.y, srp.z, 1);
        homogeneousSRP = Matrix.multiply([totalMatrix, homogeneousSRP]);
        this.scene.view.srp = CG.Vector3(homogeneousSRP.x, homogeneousSRP.y, homogeneousSRP.z);        
    }
    
    //
    moveLeft() {
        let prp = this.scene.view.prp;
        let srp = this.scene.view.srp;
        let vup = this.scene.view.vup;
        let vrcn = prp.subtract(srp);
        vrcn.normalize();
    
        let vrcu = vup.cross(vrcn);
        vrcu.normalize()

        this.scene.view.prp = this.scene.view.prp.subtract(vrcu);
        this.scene.view.srp = this.scene.view.srp.subtract(vrcu);
    }
    
    //
    moveRight() {
        let prp = this.scene.view.prp;
        let srp = this.scene.view.srp;
        let vup = this.scene.view.vup;
        let vrcn = prp.subtract(srp);
        vrcn.normalize();
    
        let vrcu = vup.cross(vrcn);
        vrcu.normalize()

        this.scene.view.prp = this.scene.view.prp.add(vrcu);
        this.scene.view.srp = this.scene.view.srp.add(vrcu);
    }
    
    //
    moveBackward() {
        let prp = this.scene.view.prp;
        let srp = this.scene.view.srp;
        let vrcn = prp.subtract(srp);
        vrcn.normalize();

        this.scene.view.prp = prp.add(vrcn);
        this.scene.view.srp = srp.add(vrcn);
    }
    
    //
    moveForward() {
        let prp = this.scene.view.prp;
        let srp = this.scene.view.srp;
        let vrcn = prp.subtract(srp);
        vrcn.normalize();

        // console.log(vrcn.values);

        this.scene.view.prp = prp.subtract(vrcn);
        this.scene.view.srp = srp.subtract(vrcn);
    }
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
        // TODO: implement drawing here!
        // For each model
        //  * For each vertex
        //    * transform endpoints to canonical view volume
        //    * For each line segment in each edge
        //      * clip in 3D (modified)
        //      * project to 2D
        //      * translate/scale to viewport (i.e. window)
        //      * draw line
      
        let view = this.scene.view;
        let nPerMatrix = CG.mat4x4Perspective(view.prp, view.srp, view.vup, view.clip);
        let mPerMatrix = CG.mat4x4MPer();
      
        // For each model
        for (let i = 0; i < this.scene.models.length; i++) {
          let model = this.scene.models[i];
      
          // For each vertex, transform into canonical view volume
          let canonicalVertices = [];
          for (let j = 0; j < model.vertices.length; j++) {
            canonicalVertices.push(Matrix.multiply([nPerMatrix, model.vertices[j]]));
          }
      
          // Clip all edges in 3D
          let clippedEdges = [];
          for (let j = 0; j < model.edges.length; j++) {
            let edges = model.edges[j];
            let clippedEdge = [];
            for (let k = 0; k < edges.length - 1; k++) {
              let clippedLine = this.clipLinePerspective({
                pt0: canonicalVertices[edges[k]],
                pt1: canonicalVertices[edges[k + 1]],
              }, view.clip); // Pass the clipping planes array
              if (clippedLine) {
                clippedEdge.push(clippedLine.pt0.x, clippedLine.pt0.y, clippedLine.pt1.x, clippedLine.pt1.y);
              }
            }
            if (clippedEdge.length > 0) {
              clippedEdges.push(clippedEdge);
            }
          }
      
          // Project all vertices to 2D
          for (let j = 0; j < canonicalVertices.length; j++) {
            // Multiply by Mper
            canonicalVertices[j] = Matrix.multiply([mPerMatrix, canonicalVertices[j]]);
      
            // Convert from homogenous to cartesian
            canonicalVertices[j].x /= canonicalVertices[j].w;
            canonicalVertices[j].y /= canonicalVertices[j].w;
            canonicalVertices[j].w = 1;
          }
      
          // Convert all clipped vertices to viewport/window
          let viewportMatrix = CG.mat4x4Viewport(this.canvas.width, this.canvas.height);
          for (let j = 0; j < canonicalVertices.length; j++) {
            canonicalVertices[j] = Matrix.multiply([viewportMatrix, canonicalVertices[j]])
          }
      
          // Draw each line segment
          for (let j = 0; j < model.edges.length; j++) {
            let edges = model.edges[j];
            for (let k = 0; k < edges.length - 1; k++) {
              this.drawLine(canonicalVertices[edges[k]].x, canonicalVertices[edges[k]].y, canonicalVertices[edges[k + 1]].x, canonicalVertices[edges[k + 1]].y);
            }
          }
        }
      }
    
    // Function to project vertices to 2D
    projectVertices(vertices, projectionMatrix) {
        let projectedVertices = [];
        for (let j = 0; j < vertices.length; j++) {
            let projectedVertex = Matrix.multiply([projectionMatrix, vertices[j]]);
            projectedVertex.x /= projectedVertex.w;
            projectedVertex.y /= projectedVertex.w;
            projectedVertex.w = 1;
            projectedVertices.push(projectedVertex);
        }
        return projectedVertices;
    }
    

    // Get outcode for a vertex
    // vertex:       Vector4 (transformed vertex in homogeneous coordinates)
    // z_min:        float (near clipping plane in canonical view volume)
    outcodePerspective(vertex, z_min) {
        let outcode = 0;
        if (vertex.x < (vertex.z - FLOAT_EPSILON)) {
            outcode += LEFT;
        }
        else if (vertex.x > (-vertex.z + FLOAT_EPSILON)) {
            outcode += RIGHT;
        }
        if (vertex.y < (vertex.z - FLOAT_EPSILON)) {
            outcode += BOTTOM;
        }
        else if (vertex.y > (-vertex.z + FLOAT_EPSILON)) {
            outcode += TOP;
        }
        if (vertex.z < (-1.0 - FLOAT_EPSILON)) {
            outcode += FAR;
        }
        else if (vertex.z > (z_min + FLOAT_EPSILON)) {
            outcode += NEAR;
        }
        return outcode;
    }

    // Clip line - should either return a new line (with two endpoints inside view volume)
    //             or null (if line is completely outside view volume)
    // line:         object {pt0: Vector4, pt1: Vector4}
    // z_min:        float (near clipping plane in canonical view volume)
    clipLinePerspective(line, z_min) {
        let result = null;
        let p0 = Vector3(line.pt0.x, line.pt0.y, line.pt0.z); 
        let p1 = Vector3(line.pt1.x, line.pt1.y, line.pt1.z);
        let out0 = this.outcodePerspective(p0, z_min);
        let out1 = this.outcodePerspective(p1, z_min);
    
        // Loop until trivially accept or reject
        while (true) {
            // Check we can trivially accept or reject
            if (out0 | out1 == 0) { // Trivially accept; all endpoints in the canvas
                return line;
            } else if (out0 & out1 != 0) { // Trivially reject; some endpoints outside canvas
                return null;
            }
            
            // Always have p0 be the one outside the view
            if (out0 == 0) { // out0 is outside view
                let temp = p0;
                p0 = p1;
                p1 = temp;
                temp = out0;
                out0 = out1;
                out1 = temp;
            } 
    
            // Find first bit set to 1 and clip against it
            let bitPosition;
            for (let i = 0; i < 6; i++) {
                if ((out0 >> i) & 1) {
                    bitPosition = i;
                    break;
                }
            }
    
            switch (bitPosition) {
                case 0: // Clip against left
                    console.log("Clipping line left");
                    let tLeft = (-p0.x + z_min * p0.z) / (p1.x - p0.x + (z_min - p1.z));
                    p0.x = p0.x + tLeft * (p1.x - p0.x);
                    p0.y = p0.y + tLeft * (p1.y - p0.y);
                    p0.z = z_min;
                    break;
                case 1: // Clip against right
                    console.log("Clipping line right");
                    let tRight = (p0.x + z_min * p0.z) / (p1.x - p0.x - (z_min + p1.z));
                    p0.x = p0.x + tRight * (p1.x - p0.x);
                    p0.y = p0.y + tRight * (p1.y - p0.y);
                    p0.z = -z_min;
                    break;
                case 2: // Clip against bottom
                    console.log("Clipping line bottom");
                    let tBottom = (-p0.y + z_min * p0.z) / (p1.y - p0.y + (z_min - p1.z));
                    p0.x = p0.x + tBottom * (p1.x - p0.x);
                    p0.y = p0.y + tBottom * (p1.y - p0.y);
                    p0.z = z_min;
                    break;
                case 3: // Clip against top
                    console.log("Clipping line top");
                    let tTop = (p0.y + z_min * p0.z) / (p1.y - p0.y - (z_min + p1.z));
                    p0.x = p0.x + tTop * (p1.x - p0.x);
                    p0.y = p0.y + tTop * (p1.y - p0.y);
                    p0.z = -z_min;
                    break;
                case 4: // Clip against far
                    console.log("Clipping line far");
                    let tFar = (-p0.z - 1) / (p1.z - p0.z - 1);
                    p0.x = p0.x + tFar * (p1.x - p0.x);
                    p0.y = p0.y + tFar * (p1.y - p0.y);
                    p0.z = -1;
                    break;
                case 5: // Clip against near
                    console.log("Clipping line near");
                    let tNear = (z_min - p0.z) / (p1.z - p0.z);
                    p0.x = p0.x + tNear * (p1.x - p0.x);
                    p0.y = p0.y + tNear * (p1.y - p0.y);
                    p0.z = z_min;
                    break;
            }
            out0 = this.outcodePerspective(p0, z_min);
        }
        return result;
    }

    //
    animate(timestamp) {
        // Get time and delta time for animation
        if (this.start_time === null) {
            this.start_time = timestamp;
            this.prev_time = timestamp;
        }
        let time = timestamp - this.start_time;
        let delta_time = timestamp - this.prev_time;

        // Update transforms for animation
        this.updateTransforms(time, delta_time);

        // Draw slide
        this.draw();

        // Invoke call for next frame in animation
        if (this.enable_animation) {
            window.requestAnimationFrame((ts) => {
                this.animate(ts);
            });
        }

        // Update previous time to current one for next calculation of delta time
        this.prev_time = timestamp;
    }

    //
    updateScene(scene) {
        this.scene = this.processScene(scene);
        if (!this.enable_animation) {
            this.draw();
        }
    }

    // Convert JSON file to vectors (don't need to modify)
    processScene(scene) {
        let processed = {
            view: {
                prp: CG.Vector3(scene.view.prp[0], scene.view.prp[1], scene.view.prp[2]),
                srp: CG.Vector3(scene.view.srp[0], scene.view.srp[1], scene.view.srp[2]),
                vup: CG.Vector3(scene.view.vup[0], scene.view.vup[1], scene.view.vup[2]),
                clip: [...scene.view.clip]
            },
            models: []
        };

        for (let i = 0; i < scene.models.length; i++) {
            let model = { type: scene.models[i].type };
            if (model.type === 'generic') {
                model.vertices = [];
                model.edges = JSON.parse(JSON.stringify(scene.models[i].edges));
                for (let j = 0; j < scene.models[i].vertices.length; j++) {
                    model.vertices.push(CG.Vector4(scene.models[i].vertices[j][0],
                                                   scene.models[i].vertices[j][1],
                                                   scene.models[i].vertices[j][2],
                                                   1));
                    if (scene.models[i].hasOwnProperty('animation')) {
                        model.animation = JSON.parse(JSON.stringify(scene.models[i].animation));
                    }
                }
            }
            else {
                model.center = Vector4(scene.models[i].center[0],
                                       scene.models[i].center[1],
                                       scene.models[i].center[2],
                                       1);
                for (let key in scene.models[i]) {
                    if (scene.models[i].hasOwnProperty(key) && key !== 'type' && key != 'center') {
                        model[key] = JSON.parse(JSON.stringify(scene.models[i][key]));
                    }
                }
            }

            model.matrix = new Matrix(4, 4);
            processed.models.push(model);
        }

        return processed;
    }
    
    // x0:           float (x coordinate of p0)
    // y0:           float (y coordinate of p0)
    // x1:           float (x coordinate of p1)
    // y1:           float (y coordinate of p1)
    drawLine(x0, y0, x1, y1) {
        this.ctx.strokeStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.moveTo(x0, y0);
        this.ctx.lineTo(x1, y1);
        this.ctx.stroke();

        this.ctx.fillStyle = '#FF0000';
        this.ctx.fillRect(x0 - 2, y0 - 2, 4, 4);
        this.ctx.fillRect(x1 - 2, y1 - 2, 4, 4);
    }
};

export { Renderer };
