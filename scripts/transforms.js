import { Matrix, Vector } from "./matrix.js";

// create a 4x4 matrix to the perspective projection / view matrix
function mat4x4Perspective(prp, srp, vup, clip) {
    // 1. translate PRP to origin
    let prpTranslate = new Matrix(4, 4);
    prpTranslate.values = [[1, 0, 0, -prp.x],
                           [0, 1, 0, -prp.y],
                           [0, 0, 1, -prp.z],
                           [0, 0, 0, 1]]; 

    // console.log("Translate: ");
    // console.log(prpTranslate);
    
    // 2. rotate VRC such that (u,v,n) align with (x,y,z)
    let vrcn = prp.subtract(srp);
    vrcn.normalize();

    let vrcu = vup.cross(vrcn);
    vrcu.normalize()

    let vrcv = vrcn.cross(vrcu);
    
    let vrcRotate = new Matrix(4, 4);
    vrcRotate.values = [[vrcu.x, vrcu.y, vrcu.z, 0],
                        [vrcv.x, vrcv.y, vrcv.z, 0],
                        [vrcn.x, vrcn.y, vrcn.z, 0],
                        [0, 0, 0, 1]]; 

    // 3. shear such that CW is on the z-axis
    // Clip array order is left, right, bottom, top, near, far
    // As PRP is at origin the center window = DOP
    let centerWindow = new Vector3(
        (clip[0] + clip[1]) / 2,
        (clip[2] + clip[3]) / 2,
        -clip[4]
    );

    let shearMatrix = new Matrix(4, 4);
    mat4x4ShearXY(shearMatrix, -centerWindow.x / centerWindow.z, -centerWindow.y / centerWindow.z);

    // 4. scale such that view volume bounds are ([z,-z], [z,-z], [-1,zmin])
    let scaleMatrix = new Matrix(4, 4);
    let sperx = (2 * clip[4]) / ((clip[1] - clip[0]) * clip[5]);
    let spery = (2 * clip[4]) / ((clip[3] - clip[2]) * clip[5]);
    let sperz = 1 / clip[5];
    scaleMatrix.values = [[sperx, 0, 0, 0],
                          [0, spery, 0, 0],
                          [0, 0, sperz, 0],
                          [0, 0, 0, 1]]; 

    let transform = Matrix.multiply([scaleMatrix, shearMatrix, vrcRotate, prpTranslate]);
    return transform;
}

// create a 4x4 matrix to project a perspective image on the z=-1 plane
function mat4x4MPer() {
    let mper = new Matrix(4, 4);
    mper.values = [[1, 0, 0, 0],
                    [0, 1, 0, 0],
                    [0, 0, 1, 0],
                    [0, 0, -1, 0]]; 
    return mper;
}

// create a 4x4 matrix to translate/scale projected vertices to the viewport (window)
function mat4x4Viewport(width, height) {
    let viewport = new Matrix(4, 4);
    viewport.values = [[width / 2, 0, 0, width / 2],
                   [0, height / 2, 0, height / 2],
                   [0, 0, 1, 0],
                   [0, 0, 0, 1]]; 
    return viewport;
}


///////////////////////////////////////////////////////////////////////////////////
// 4x4 Transform Matrices                                                        //
///////////////////////////////////////////////////////////////////////////////////

// set values of existing 4x4 matrix to the identity matrix
function mat4x4Identity(mat4x4) {
    mat4x4.values = [[1, 0, 0, 0],
                     [0, 1, 0, 0],
                     [0, 0, 1, 0],
                     [0, 0, 0, 1]];
}

// set values of existing 4x4 matrix to the translate matrix
function mat4x4Translate(mat4x4, tx, ty, tz) {
    mat4x4.values = [[1, 0, 0, tx],
                     [0, 1, 0, ty],
                     [0, 0, 1, tz],
                     [0, 0, 0, 1]];
}

// set values of existing 4x4 matrix to the scale matrix
function mat4x4Scale(mat4x4, sx, sy, sz) {
    mat4x4.values = [[sx, 0, 0, 0],
                     [0, sy, 0, 0],
                     [0, 0, sz, 0],
                     [0, 0, 0, 1]];
}

// set values of existing 4x4 matrix to the rotate about x-axis matrix
function mat4x4RotateX(mat4x4, theta) {
    mat4x4.values = [[1, 0, 0, 0],
                     [0, Math.cos(theta), -Math.sin(theta), 0],
                     [0, Math.sin(theta), Math.cos(theta), 0],
                     [0, 0, 0, 1]];
}

// set values of existing 4x4 matrix to the rotate about y-axis matrix
function mat4x4RotateY(mat4x4, theta) {
    mat4x4.values = [[Math.cos(theta), 0, Math.sin(theta), 0],
                     [0, 1, 0, 0],
                     [-Math.sin(theta), 0, Math.cos(theta), 0],
                     [0, 0, 0, 1]];
}

// set values of existing 4x4 matrix to the rotate about z-axis matrix
function mat4x4RotateZ(mat4x4, theta) {
    mat4x4.values = [[Math.cos(theta), -Math.sin(theta), 0, 0],
                     [Math.sin(theta), Math.cos(theta), 0, 0],
                     [0, 0, 1, 0],
                     [0, 0, 0, 1]];
}

// set values of existing 4x4 matrix to the shear parallel to the xy-plane matrix
function mat4x4ShearXY(mat4x4, shx, shy) {
    mat4x4.values = [[1, 0, shx, 0],
                     [0, 1, shy, 0],
                     [0, 0, 1, 0],
                     [0, 0, 0, 1]];
}

// create a new 3-component vector with values x,y,z
function Vector3(x, y, z) {
    let vec3 = new Vector(3);
    vec3.values = [x, y, z];
    return vec3;
}

// create a new 4-component vector with values x,y,z,w
function Vector4(x, y, z, w) {
    let vec4 = new Vector(4);
    vec4.values = [x, y, z, w];
    return vec4;
}

export {
    mat4x4Perspective,
    mat4x4MPer,
    mat4x4Viewport,
    mat4x4Identity,
    mat4x4Translate,
    mat4x4Scale,
    mat4x4RotateX,
    mat4x4RotateY,
    mat4x4RotateZ,
    mat4x4ShearXY,
    Vector3,
    Vector4
};
