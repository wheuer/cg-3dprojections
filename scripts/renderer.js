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

    // Animations, time is in milliseconds
    updateTransforms(time, delta_time) {
        // Update all rotation matrices of all models
        for (let i = 0; i < this.scene.models.length; i++) {
            let model = this.scene.models[i];
            if (model.hasOwnProperty('animation')) {
                // Overall process will be move the model to the origin, rotate, and move back
                // Move to origin
                let moveForwad = new Matrix(4, 4);
                CG.mat4x4Translate(moveForwad, -model.center.x, -model.center.y, -model.center.z);

                // Rotate
                let rotation = ((time / 1000) * model.animation.rps * 2 * Math.PI);
                let rotate = new Matrix(4, 4);
                if (model.animation.axis === "x") {
                    CG.mat4x4RotateX(rotate, rotation);
                } else if (model.animation.axis === "y") {
                    CG.mat4x4RotateY(rotate, rotation);
                } else if (model.animation.axis === "z") {
                    CG.mat4x4RotateZ(rotate, rotation);
                }

                // Move back from origin
                let moveBackward = new Matrix(4, 4);
                CG.mat4x4Translate(moveBackward, model.center.x, model.center.y, model.center.z);

                // Update models matrix
                this.scene.models[i].matrix = Matrix.multiply([moveBackward, rotate, moveForwad]);
            }
        }
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

        this.scene.view.prp = prp.subtract(vrcn);
        this.scene.view.srp = srp.subtract(vrcn);
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
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
            
            // Apply transformation matrix of model to all vertices
            // Cannot change the actual model's vertices so need a local copy
            let localVertices = [];
            for (let j = 0; j < model.vertices.length; j++) {
                localVertices.push(Matrix.multiply([model.matrix, model.vertices[j]]));
            }

            // For each vertex, transform into canonical view volume
            let canonicalVertices = [];
            for (let j = 0; j < model.vertices.length; j++) {
                canonicalVertices.push(Matrix.multiply([nPerMatrix, localVertices[j]]));
            }
      
            // Clip all edges in 3D
            // Make a new list of edges that have been clipped and are valid. The new format will be one array per edge so [0, 1] would be an edge between vertices 0 -> 1.
            let totalClippedEdges = [];
            for (let j = 0; j < model.edges.length; j++) {
                let edges = model.edges[j];
                for (let k = 0; k < edges.length - 1; k++) {
                    let clippedLine = this.clipLinePerspective({
                        pt0: canonicalVertices[edges[k]],
                        pt1: canonicalVertices[edges[k + 1]],
                    }, view.clip); // Pass the clipping planes array
                    if (clippedLine) {
                        totalClippedEdges.push([clippedLine.pt0, clippedLine.pt1]);
                    }
                }
            }

            // Project all vertices to 2D
            for (let j = 0; j < totalClippedEdges.length; j++) {
                for (let k = 0; k < totalClippedEdges[j].length; k++) {
                    // Multiply by Mper
                    totalClippedEdges[j][k] = Matrix.multiply([mPerMatrix, totalClippedEdges[j][k]]);
                
                    // Convert from homogenous to cartesian
                    totalClippedEdges[j][k].x /= totalClippedEdges[j][k].w;
                    totalClippedEdges[j][k].y /= totalClippedEdges[j][k].w;
                    totalClippedEdges[j][k].w = 1;
                }
            }
      
            // Convert all clipped vertices to viewport/window
            let viewportMatrix = CG.mat4x4Viewport(this.canvas.width, this.canvas.height);
            for (let j = 0; j < totalClippedEdges.length; j++) {
                for (let k = 0; k < totalClippedEdges[j].length; k++) {
                    totalClippedEdges[j][k] = Matrix.multiply([viewportMatrix, totalClippedEdges[j][k]])
                }
            }
      
            // Draw each line segment of the clipped edges
            for (let j = 0; j < totalClippedEdges.length; j++) {
                this.drawLine(totalClippedEdges[j][0].x, totalClippedEdges[j][0].y, totalClippedEdges[j][1].x, totalClippedEdges[j][1].y);
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
        let p0 = Vector3(line.pt0.x, line.pt0.y, line.pt0.z); 
        let p1 = Vector3(line.pt1.x, line.pt1.y, line.pt1.z);
        let out0 = this.outcodePerspective(p0, z_min);
        let out1 = this.outcodePerspective(p1, z_min);
        let result = null;

        // Loop until trivially accept or reject
        while (true) {
            // Check we can trivially accept or reject
            if ((out0 | out1) == 0) { // Trivially accept; all endpoints in the canvas
                break;
            } else if ((out0 & out1) != 0) { // Trivially reject; both endpoints outside canvas
                return null;
            }
            
            // Always have p0 be the one outside the view
            let swapped = false;
            if (out0 == 0) { // out0 is inside view so swap points
                let temp = p0;
                p0 = p1;
                p1 = temp;
                temp = out0;
                out0 = out1;
                out1 = temp;
                swapped = true;
            } 
    
            // Find first bit set to 1 and clip against it
            let bitPosition;
            for (let i = 0; i < 6; i++) {
                if ((out0 >> i) & 1) {
                    bitPosition = i;
                    break;
                }
            }
    
            let dx = p0.x - p1.x;
            let dz = p0.z - p1.z;
            let dy = p0.y - p1.y;
            let t;
            switch (bitPosition) {
                case 5: // Clip against left
                    t = (-p1.x + p1.z) / (dx - dz);
                    break;
                case 4: // Clip against right
                    t = (p1.x + p1.z) / (-dx - dz);
                    break;
                case 3: // Clip against bottom
                    t = (-p1.y + p1.z) / (dy - dz);
                    break;
                case 2: // Clip against top
                    t = (p1.y + p1.z) / (-dy - dz);
                    break;
                case 1: // Clip against far
                    t = (-p1.z - 1) / dz;
                    break;
                case 0: // Clip against near
                    t = (p1.z - z_min) / -dz;
                    break;
            }
            p0.x = p1.x + t * dx;
            p0.y = p1.y + t * dy;
            p0.z = p1.z + t * dz;

            // If p0 and p1 were swapped, make sure to swap back
            if (swapped == true) {
                let temp = p0;
                p0 = p1;
                p1 = temp;
                swapped = false;
            }

            // Re-calculate the outcodes based on the new point locations
            out0 = this.outcodePerspective(p0, z_min);
            out1 = this.outcodePerspective(p1, z_min);
        }

        // Points were trivally accepted, return final point locations
        result = {
            pt0: CG.Vector4(p0.x, p0.y, p0.z, 1),
            pt1: CG.Vector4(p1.x, p1.y, p1.z, 1),
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

    // Convert JSON file to vectors
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
            } else if (model.type === 'cube') {
                model.vertices = [];
                model.edges = [];

                let center = scene.models[i].center;
                let width = scene.models[i].width;
                let height = scene.models[i].height;
                let depth = scene.models[i].depth;

                model.center = CG.Vector3(center[0], center[1], center[2]);
                
                model.vertices.push(CG.Vector4(center[0] - width/2, center[1] - height/2, center[2] - depth/2, 1)); // Back bottom left corner,  0
                model.vertices.push(CG.Vector4(center[0] - width/2, center[1] + height/2, center[2] - depth/2, 1)); // Back upper left corner,   1
                model.vertices.push(CG.Vector4(center[0] + width/2, center[1] + height/2, center[2] - depth/2, 1)); // Back upper right corner,  2
                model.vertices.push(CG.Vector4(center[0] + width/2, center[1] - height/2, center[2] - depth/2, 1)); // Back bottom right corner, 3
                
                model.vertices.push(CG.Vector4(center[0] - width/2, center[1] - height/2, center[2] + depth/2, 1)); // Front bottom left corner, 4
                model.vertices.push(CG.Vector4(center[0] - width/2, center[1] + height/2, center[2] + depth/2, 1)); // Front upper left corner,  5
                model.vertices.push(CG.Vector4(center[0] + width/2, center[1] + height/2, center[2] + depth/2, 1)); // Front upper right corner, 6
                model.vertices.push(CG.Vector4(center[0] + width/2, center[1] - height/2, center[2] + depth/2, 1)); // Front bottom right corner,7
                
                // Front and back rectanles
                model.edges.push([0, 1, 2, 3, 0]); // Back
                model.edges.push([4, 5, 6, 7, 4]); // Front
                
                 // Cross pieces
                model.edges.push([0, 4]);
                model.edges.push([1, 5]);
                model.edges.push([2, 6]);
                model.edges.push([3, 7]);

                if (scene.models[i].hasOwnProperty('animation')) {
                    model.animation = JSON.parse(JSON.stringify(scene.models[i].animation));
                }
            } else if (model.type === 'cone') {
                model.vertices = [];
                model.edges = [];

                let center = scene.models[i].center;
                let radius = scene.models[i].radius;
                let height = scene.models[i].height;
                let sides = scene.models[i].sides;

                model.center = CG.Vector3(center[0], center[1], center[2]);

                // Create base "circle"
                let radianIncrement = 2*Math.PI / sides;
                let currentRadians = 0;
                for (let j = 0; j < sides; j++) {
                    model.vertices.push(CG.Vector4(center[0] + (radius * Math.cos(currentRadians)), center[1] - height/2, center[2] - (radius * Math.sin(currentRadians)), 1));
                    currentRadians += radianIncrement;
                }

                model.vertices.push(CG.Vector4(center[0], center[1] + height/2, center[2], 1));

                // Connect all sides together
                for (let j = 0; j < sides - 1; j++) {
                    model.edges.push([j, j + 1]);
                }
                model.edges.push([sides - 1, 0]);

                // Connect all other vertices to point on top
                for (let j = 0; j < sides; j++) {
                    model.edges.push([sides, j]);
                }

                if (scene.models[i].hasOwnProperty('animation')) {
                    model.animation = JSON.parse(JSON.stringify(scene.models[i].animation));
                }
            } else if (model.type === 'cylinder') {
                model.vertices = [];
                model.edges = [];

                let center = scene.models[i].center;
                let radius = scene.models[i].radius;
                let height = scene.models[i].height;
                let sides = scene.models[i].sides;

                model.center = CG.Vector3(center[0], center[1], center[2]);

                // Create base "circle"
                let radianIncrement = 2*Math.PI / sides;
                let currentRadians = 0;
                for (let j = 0; j < sides; j++) {
                    model.vertices.push(CG.Vector4(center[0] + (radius * Math.cos(currentRadians)), center[1] - height/2, center[2] - (radius * Math.sin(currentRadians)), 1));
                    currentRadians += radianIncrement;
                }

                // Connect all bottom "circle" sides together
                for (let j = 0; j < sides - 1; j++) {
                    model.edges.push([j, j + 1]);
                }
                model.edges.push([sides - 1, 0]);

                // Create top "circle"
                currentRadians = 0;
                for (let j = 0; j < sides; j++) {
                    model.vertices.push(CG.Vector4(center[0] + (radius * Math.cos(currentRadians)), center[1] + height/2, center[2] - (radius * Math.sin(currentRadians)), 1));
                    currentRadians += radianIncrement;
                }

                // Connect all bottom "circle" sides together
                for (let j = sides; j < 2*sides - 1; j++) {
                    model.edges.push([j, j + 1]);
                }
                model.edges.push([2*sides - 1, sides]);

                // Connect top circle to bottom circle
                for (let j = 0; j < sides; j++) {
                    model.edges.push([j, sides + j]);
                }

                if (scene.models[i].hasOwnProperty('animation')) {
                    model.animation = JSON.parse(JSON.stringify(scene.models[i].animation));
                }
            } else if (model.type === "sphere") {
                model.vertices = [];
                model.edges = [];

                let center = scene.models[i].center;
                let radius = scene.models[i].radius;
                let slices = scene.models[i].slices; // Same as number of sides for each stack
                let stacks = scene.models[i].stacks; // Number of "circles" that make up the sphere

                if (slices < 3 || stacks < 3) {
                    console.log("Invalid circle slices and/or stacks. Both must be at least 3.");
                    break;
                }

                model.center = CG.Vector3(center[0], center[1], center[2]);

                // The radius follows r*sin(theta) as you go up and down the stacks
                // The horizontal_increment is just the height/stacks
                // Then with a defined radius the x,y,z are:
                //  x = center.x + radius
                //  y = center.y + horizontal_increment
                //  z = center.z + radius*cos(theta)

                // Create all the sphere's vertices
                for (let j = 0; j < stacks - 1; j++) {
                    let radiusRadianIncrement = Math.PI * ((j + 1) / stacks);
                    for (let k = 0; k < slices; k++) {
                        let radianIncrement = 2 * Math.PI * (k / slices);
                        model.vertices.push(CG.Vector4(
                            center[0] + radius*Math.sin(radiusRadianIncrement)*Math.cos(radianIncrement), 
                            center[1] + radius*Math.cos(radiusRadianIncrement), 
                            center[2] + radius*Math.sin(radiusRadianIncrement)*Math.sin(radianIncrement),
                            1));
                    }
                }

                // Create edges between all stack vertices
                for (let j = 0; j < stacks - 2; j++) {
                    for (let k = 0; k < slices; k++) {
                        model.edges.push([j * stacks + k, (j+1) * stacks + k]);
                    }   
                }

                // Create inner edges of all stacks
                for (let j = 0; j < stacks - 1; j++) {
                    for (let k = 0; k < slices - 1; k++) {
                        model.edges.push([j * slices + k, j * slices + k + 1]);
                    }
                    model.edges.push([j * slices + slices - 1, j * slices]);
                }

                // Create the north and south poles
                model.vertices.push(CG.Vector4(center[0], center[1] + radius, center[2], 1));
                model.vertices.push(CG.Vector4(center[0], center[1] - radius, center[2], 1));

                // Connect first and last stack to north and south poles respectively
                for (let j = 0; j < slices; j++) {
                    model.edges.push([model.vertices.length - 2, j]);
                    model.edges.push([model.vertices.length - 1, model.vertices.length - 3 - j]);
                }

                if (scene.models[i].hasOwnProperty('animation')) {
                    model.animation = JSON.parse(JSON.stringify(scene.models[i].animation));
                }

            } else {
                model.center = CG.Vector4(scene.models[i].center[0],
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
