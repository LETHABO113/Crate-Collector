// Creates and compiles a shader from source code.
function shaderCreator(gl, type, source){
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}

// Links a vertex shader and fragment shader into one WebGL program.
function programCreator(gl, vss, fss){
    const vertexShader = shaderCreator(gl, gl.VERTEX_SHADER, vss);
    const fragmentShader = shaderCreator(gl, gl.FRAGMENT_SHADER, fss);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    return program;
}

// Creates a GPU buffer and uploads the given typed array into it.
function bufferCreator(gl, data, target){
    const buffer = gl.createBuffer();
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, data, gl.STATIC_DRAW);
    return buffer;
}

// Creates a texture and configures filtering/wrapping settings.
function textureCreator(gl, image){
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // Mipmaps only work automatically for power-of-two textures.
    function isPowerOf2(value){
        return (value & (value - 1)) === 0;
    }

    if (isPowerOf2(image.width) && isPowerOf2(image.height)){
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    }else{
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    return texture;
}

// Loads an image file so it can later be uploaded as a WebGL texture.
function loadImage(src){
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Failed to load image` + src));
        image.src = src;
    });
}
