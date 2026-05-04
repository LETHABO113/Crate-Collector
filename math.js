// Identity matrix - leaves an object unchanged.
function identity(){
    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
}

// Scale matrix - stretches or shrinks an object on the x, y, and z axes.
function scale(sx, sy, sz){
    return new Float32Array([
        sx, 0, 0, 0,
        0, sy, 0, 0,
        0, 0, sz, 0,
        0, 0, 0, 1
    ]);
}

// Translation matrix - moves an object to a position in the world.
function translate(tx, ty, tz){
    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        tx, ty, tz, 1
    ]);
} 

// Rotation around the x axis - tilts an object forward or backward.
function rotX(theta){
    let c = Math.cos(theta);
    let s = Math.sin(theta);
    return new Float32Array([
        1, 0, 0, 0,
        0, c, -s, 0,
        0, s, c, 0,
        0, 0, 0, 1
    ]);
}

// Rotation around the y axis - spins an object left or right.
function rotY(theta){
    let c = Math.cos(theta);
    let s = Math.sin(theta);
    return new Float32Array([
        c, 0, -s, 0,
        0, 1, 0, 0,
        s, 0, c, 0,
        0, 0, 0, 1
    ]);
}

// Rotation around the z axis - spins an object clockwise or counterclockwise.
function rotZ(theta){
    let c = Math.cos(theta);
    let s = Math.sin(theta);
    return new Float32Array([
        c, -s, 0, 0,
        s, c, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
}

// Perspective matrix - makes far objects appear smaller.
// fov = field of view in radians.
// aspect = canvas width / canvas height.
// near and far = visible depth range of the camera.
function perspective(fov, aspect, near, far) {
    let f = 1 / Math.tan(fov / 2);
    let nf = 1 / (near - far);

    return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) * nf, -1,
        0, 0, (2 * far * near) * nf, 0
    ]);
}

// Multiplies two 4x4 matrices.
function multiply(a, b){
    const result  = new Float32Array(16);
    for (let row = 0; row < 4; row++){
        for (let col = 0; col < 4; col++){
            let sum = 0;
            for (let i = 0; i < 4; i++){
                sum += a[i * 4 + row] * b [col * 4 + i];
            }
            result[col *  4 + row] = sum;
        }
    }
    return result;
}

// View matrix - positions the camera and points it at the target.
function view(eye, target, up){
    // Forward vector - direction from target back to the camera.
    let fx = eye[0] - target[0];
    let fy = eye[1] - target[1];
    let fz = eye[2] - target[2];

    // Normalize the forward vector.
    let flen = Math.sqrt(fx*fx + fy*fy + fz*fz);
    fx /= flen;
    fy /= flen;
    fz /= flen;

    // Right vector from the cross product of up and forward.
    let rx = up[1]*fz - up[2]*fy;
    let ry = up[2]*fx - up[0]*fz;
    let rz = up[0]*fy - up[1]*fx;

    // Normalize the right vector.
    let rlen = Math.sqrt(rx*rx + ry*ry + rz*rz);
    rx /= rlen;
    ry /= rlen;
    rz /= rlen;

    // True up vector from the cross product of forward and right.
    const ux = fy*rz - fz*ry;
    const uy = fz*rx - fx*rz;
    const uz = fx*ry - fy*rx;

    return new Float32Array([
         rx, ux, -fx, 0,
        ry, uy, -fy, 0,
        rz, uz, -fz, 0,
        -(rx*eye[0] + ry*eye[1] + rz*eye[2]), -(ux*eye[0] + uy*eye[1] + uz*eye[2]), (fx*eye[0] + fy*eye[1] + fz*eye[2]), 1
    ]);
 }
