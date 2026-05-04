// Vertex shader: transforms each cube vertex from model space to clip space.
const vss = `
    attribute vec3 pos;
    attribute vec2 vtexture;

    uniform mat4 model;
    uniform mat4 view;
    uniform mat4 projection;

    varying vec2 fragtexture;

    void main() {
        fragtexture = vtexture;
        gl_Position = projection * view * model * vec4(pos, 1.0);
    }
`;

// Fragment shader: samples the texture color for each pixel.
const fss = `
    precision mediump float;
    varying vec2 fragtexture;
    uniform sampler2D fragsampler;

    void main() {
        gl_FragColor = texture2D(fragsampler, fragtexture);
    }
`;

// Cube geometry with texture coordinates for each face.
const cubeVert = new Float32Array([
    //front
    -0.5, -0.5, 0.5, 0.0, 0.0,
    0.5, -0.5, 0.5, 1.0, 0.0,
    0.5, 0.5, 0.5, 1.0, 1.0,
    -0.5, 0.5, 0.5, 0.0, 1.0,
    //back
    0.5, -0.5, -0.5, 0.0, 0.0,
    -0.5, -0.5, -0.5, 1.0, 0.0,
    -0.5, 0.5, -0.5, 1.0, 1.0,
    0.5, 0.5, -0.5, 0.0, 1.0,
    //left side
    -0.5, -0.5, -0.5, 0.0, 0.0,
    -0.5, -0.5, 0.5, 1.0, 0.0,
    -0.5, 0.5, 0.5, 1.0, 1.0,
    -0.5, 0.5, -0.5, 0.0, 1.0,
    //right side
    0.5, -0.5, 0.5, 0.0, 0.0,
    0.5, -0.5, -0.5, 1.0, 0.0,
    0.5, 0.5, -0.5, 1.0, 1.0,
    0.5, 0.5, 0.5, 0.0, 1.0,
    //top side
    -0.5, 0.5, 0.5, 0.0, 0.0,
    0.5, 0.5, 0.5, 1.0, 0.0,
    0.5, 0.5, -0.5, 1.0, 1.0,
    -0.5, 0.5, -0.5, 0.0, 1.0,
    //buttom side
    -0.5, -0.5, -0.5, 0.0, 0.0,
    0.5, -0.5, -0.5, 1.0, 0.0,
    0.5, -0.5, 0.5, 1.0, 1.0,
    -0.5, -0.5, 0.5, 0.0, 1.0,
]);

const cubeIndices = new Uint16Array([
    0, 1, 2, 0, 2, 3,
    4, 5, 6, 4, 6, 7,
    8, 9, 10, 8, 10, 11,
    12, 13, 14, 12, 14, 15,
    16, 17, 18, 16, 18, 19,
    20, 21, 22, 20, 22, 23,
]);

// game settings.
const ROOM_BOUNDARY = 4.5;
const PLAYER_RADIUS = 0.35;
const MAZE_CELL_SIZE = 1.5;
// Keep maze walls narrower than a full cell so there is space to walk between them
const MAZE_WALL_HALF_SIZE = 0.35;
const MAZE_WALL_HEIGHT = 1.55;
const CRATE_SCALE = 0.8;
const CRATE_HALF_SIZE = CRATE_SCALE / 2;
const CRATE_MIN_SPACING = CRATE_SCALE + 0.25;

// Level data: later levels have more crates and less time.
const LEVELS = [
    {
        name: `Level 1`,
        crateCount: 1,
        timeLimit: 30,
        crateSpinSpeed: 1,
        mazeWalls: [[0, 0], [-1, 1], [1, -1]]
    },
    {
        name: `Level 2`,
        crateCount: 6,
        timeLimit: 26,
        crateSpinSpeed: 2,
        mazeWalls: [[-1, 0], [0, 0], [1, 0], [1, 1]]
    },
    {
        name: `Level 3`,
        crateCount: 11,
        timeLimit: 22,
        crateSpinSpeed: 3,
        mazeWalls: [[-1, -1], [-1, 0], [0, 1], [1, -1], [1, 0]]
    },
    {
        name: `Level 4`,
        crateCount: 16,
        timeLimit: 18,
        crateSpinSpeed: 4,
        mazeWalls: [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [0, -1], [0, 1]]
    },
    {
        name: `Level 5`,
        crateCount: 21,
        timeLimit: 14,
        crateSpinSpeed: 5,
        mazeWalls: [[-2, -1], [-2, 1], [-1, -1], [0, -1], [0, 0], [0, 1], [1, 1], [2, -1], [2, 1]]
    }
];

// Main game state that changes while the game is running.
const state = {
    player: { x: 0, y: 0, z: 3, yaw: 0 },
    crates: [],
    score: 0,
    timeLeft: LEVELS[0].timeLimit,
    gameOver: false,
    won: false,
    lastTime: 0,
    keys: {},
    levelIndex: 0,
    pendingAction: null,
    bestRecord: loadBestRecord(),
    started: false,
    mazeWalls: []
};

let gl, program;
let vertexBuffer, indexBuffer;
let crateTexture, stoneTexture, floorTexture, ceilingTexture;
let locations = {};
let projectionMatrix;
let viewMatrix;
let staticScene = {};

// One-time setup: WebGL, shaders, buffers, textures, room, and input.
async function init() {
    const canvas = document.querySelector(`#glcanvas`);
    gl = canvas.getContext(`webgl`);

    if (!gl) {
        throw new Error(`WebGL not supported`);
    }

    program = programCreator(gl, vss, fss);
    gl.useProgram(program);

    locations.position = gl.getAttribLocation(program, `pos`);
    locations.vtexture = gl.getAttribLocation(program, `vtexture`);
    locations.model = gl.getUniformLocation(program, `model`);
    locations.view = gl.getUniformLocation(program, `view`);
    locations.projection = gl.getUniformLocation(program, `projection`);
    locations.texture = gl.getUniformLocation(program, `fragsampler`);

    vertexBuffer = bufferCreator(gl, cubeVert, gl.ARRAY_BUFFER);
    indexBuffer = bufferCreator(gl, cubeIndices, gl.ELEMENT_ARRAY_BUFFER);

    const crateImage = await loadImage(`textures/crate1.png`);
    const stoneImage = await loadImage(`textures/wall1.png`);
    const floorImage = await loadImage(`textures/floor1.png`);
    const ceilingImage = await loadImage(`textures/ceiling1.png`);
    crateTexture = textureCreator(gl, crateImage);
    stoneTexture = textureCreator(gl, stoneImage);
    floorTexture = textureCreator(gl, floorImage);
    ceilingTexture = textureCreator(gl, ceilingImage);

    gl.enable(gl.DEPTH_TEST);

    // These room objects never move, so we build their model matrices once.
    staticScene.floor = multiply(translate(0, -0.05, 0), scale(10, 0.1, 10));
    staticScene.ceiling = multiply(translate(0, 1.55, 0), scale(10, 0.1, 10));
    staticScene.walls = [
        multiply(translate(0, 0.75, -5), multiply(rotY(0), scale(10, 1.55, 0.1))),
        multiply(translate(0, 0.75, 5), multiply(rotY(Math.PI), scale(10, 1.55, 0.1))),
        multiply(translate(-5, 0.75, 0), multiply(rotY(Math.PI / 2), scale(10, 1.55, 0.1))),
        multiply(translate(5, 0.75, 0), multiply(rotY(-Math.PI / 2), scale(10, 1.55, 0.1)))
    ];

    document.getElementById(`start-button`).addEventListener(`click`, startGame);
    document.getElementById(`restart-button`).addEventListener(`click`, restartCurrentRun);

    window.addEventListener(`keydown`, handleKeyDown);
    window.addEventListener(`keyup`, handleKeyUp);

    setupLevel(0);
    updateHUD();
    requestAnimationFrame(gameLoop);
}

// Handles movement keys and Enter for level transitions.
function handleKeyDown(event) {
    state.keys[event.key] = true;

    if (!state.started) {
        return;
    }

    if (event.key === `Enter` && state.pendingAction) {
        if (state.pendingAction === `nextLevel`) {
            startLevel(state.levelIndex + 1);
        } else if (state.pendingAction === `retryLevel`) {
            startLevel(state.levelIndex);
        } else if (state.pendingAction === `restartGame`) {
            startLevel(0);
        }
    }
}

// Stops movement when a key is released.
function handleKeyUp(event) {
    state.keys[event.key] = false;
}

// Returns the data for the current level.
function currentLevel() {
    return LEVELS[state.levelIndex];
}

// Loads the saved best completion time from the browser.
function loadBestRecord() {
    const stored = localStorage.getItem(`crateCollectorBestRecord`);
    if (!stored) {
        return null;
    }

    try {
        return JSON.parse(stored);
    } catch (error) {
        return null;
    }
}

// Saves a new best completion time in the browser
function saveBestRecord(record) {
    state.bestRecord = record;
    localStorage.setItem(`crateCollectorBestRecord`, JSON.stringify(record));
}

// Converts maze cell coordinates into cube transforms and collision boxes
function buildMazeWalls(wallCells) {
    return wallCells.map(([gridX, gridZ]) => {
        const x = gridX * MAZE_CELL_SIZE;
        const z = gridZ * MAZE_CELL_SIZE;

        return {
            x,
            z,
            modelMatrix: multiply(
                translate(x, 0.75, z),
                scale(MAZE_WALL_HALF_SIZE * 2, MAZE_WALL_HEIGHT, MAZE_WALL_HALF_SIZE * 2)
            )
        };
    });
}

// True when the player would intersect one of the maze walls.
function collidesWithMazeWall(x, z) {
    return state.mazeWalls.some(wall => {
        const dx = Math.abs(x - wall.x);
        const dz = Math.abs(z - wall.z);
        return dx < MAZE_WALL_HALF_SIZE + PLAYER_RADIUS && dz < MAZE_WALL_HALF_SIZE + PLAYER_RADIUS;
    });
}

// Checks whether a crate position sits inside a maze wall.
function collidesCrateWithMazeWall(x, z) {
    return state.mazeWalls.some(wall => {
        const dx = Math.abs(x - wall.x);
        const dz = Math.abs(z - wall.z);
        return dx < MAZE_WALL_HALF_SIZE + CRATE_HALF_SIZE && dz < MAZE_WALL_HALF_SIZE + CRATE_HALF_SIZE;
    });
}


// Creates crates with random positions and different rotation directions.
function createCrates(count) {
    const crates = [];
    const spawnBoundary = ROOM_BOUNDARY - 0.8;
    const rotationModes = [
        { axis: `y`, direction: 1 },
        { axis: `y`, direction: -1 },
        { axis: `x`, direction: 1 },
        { axis: `x`, direction: -1 },
        { axis: `z`, direction: 1 },
        { axis: `z`, direction: -1 }
    ];
    const maxAttempts = count * 200;
    let attempts = 0;

    while (crates.length < count && attempts < maxAttempts) {
        attempts++;
        const rotationMode = rotationModes[crates.length % rotationModes.length];
        const crate = {
            x: (Math.random() * 2 - 1) * spawnBoundary,
            y: 0,
            z: (Math.random() * 2 - 1) * spawnBoundary,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            collected: false,
            rotationAxis: rotationMode.axis,
            rotationDirection: rotationMode.direction
        };

        // Keep the spawn area fair so crates do not overlap or appear on top of the player.
        const tooCloseToPlayer = Math.abs(crate.x) < 1.25 && Math.abs(crate.z - 3) < 1.25;
        const insideMazeWall = collidesCrateWithMazeWall(crate.x, crate.z);
        const overlapsCrate = crates.some(other => {
            const dx = other.x - crate.x;
            const dz = other.z - crate.z;
            return Math.sqrt(dx * dx + dz * dz) < CRATE_MIN_SPACING;
        });

        if (!tooCloseToPlayer && !insideMazeWall && !overlapsCrate) {
            crates.push(crate);
        }
    }

    if (crates.length < count) {
        console.warn(`Only spawned ${crates.length} of ${count} crates for ${currentLevel().name}.`);
    }

    return crates;
}

// Sets up the selected level data without changing the start menu state.
function setupLevel(levelIndex) {
    state.levelIndex = levelIndex;
    state.mazeWalls = buildMazeWalls(currentLevel().mazeWalls);
    state.crates = createCrates(currentLevel().crateCount);
    state.score = 0;
    state.timeLeft = currentLevel().timeLimit;
    state.gameOver = false;
    state.won = false;
    state.pendingAction = null;
    state.player.x = 0;
    state.player.y = 0;
    state.player.z = 3;
    state.player.yaw = 0;
}

// Starts gameplay for the selected level.
function startLevel(levelIndex) {
    setupLevel(levelIndex);
    state.started = true;
    hideMenu();
    hideOverlay();
    updateHUD();
}

// Starts a new run from the first level.
function startGame() {
    state.lastTime = 0;
    startLevel(0);
}

// Restarts the current level.
function restartCurrentRun() {
    state.lastTime = 0;
    startLevel(state.levelIndex);
}

// Updates timer, movement, crate spinning, and collection logic.
function update(dt) {
    if (!state.started || state.gameOver) {
        return;
    }

    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        state.gameOver = true;
        state.won = false;
        state.pendingAction = `retryLevel`;
        showOverlay(`${currentLevel().name} failed. Press Enter to retry.`);
        updateHUD();
        return;
    }

    // Movement speed is scaled by frame time so the game stays smooth.
    const speed = 5 * dt;
    const forward = {
        x: Math.sin(state.player.yaw),
        z: -Math.cos(state.player.yaw)
    };

    const right = {
        x: Math.cos(state.player.yaw),
        z: Math.sin(state.player.yaw)
    };

    let moveX = 0;
    let moveZ = 0;

    if (state.keys[`w`] || state.keys[`W`]) {
        moveX -= forward.x * speed;
        moveZ -= forward.z * speed;
    }
    if (state.keys[`s`] || state.keys[`S`]) {
        moveX += forward.x * speed;
        moveZ += forward.z * speed;
    }
    if (state.keys[`a`] || state.keys[`A`]) {
        moveX -= right.x * speed;
        moveZ -= right.z * speed;
    }
    if (state.keys[`d`] || state.keys[`D`]) {
        moveX += right.x * speed;
        moveZ += right.z * speed;
    }

    const turnSpeed = 2 * dt;
    if (state.keys[`ArrowLeft`]) {
        state.player.yaw += turnSpeed;
    }
    if (state.keys[`ArrowRight`]) {
        state.player.yaw -= turnSpeed;
    }

    //Calculates next position inside the room
    const nextX = Math.max(-ROOM_BOUNDARY, Math.min(ROOM_BOUNDARY, state.player.x + moveX));
    const nextZ = Math.max(-ROOM_BOUNDARY, Math.min(ROOM_BOUNDARY, state.player.z + moveZ));


    if (!collidesWithMazeWall(nextX, state.player.z)) {
        state.player.x = nextX;
    }
    if (!collidesWithMazeWall(state.player.x, nextZ)) {
        state.player.z = nextZ;
    }

    // Each crate spins on its assigned axis.
    for (const crate of state.crates) {
        if (!crate.collected) {
            const spinAmount = dt * currentLevel().crateSpinSpeed * crate.rotationDirection;

            if (crate.rotationAxis === `x`) {
                crate.rotationX += spinAmount;
            } else if (crate.rotationAxis === `z`) {
                crate.rotationZ += spinAmount;
            } else {
                crate.rotationY += spinAmount;
            }
        }
    }

    // Collect a crate when the player gets close enough to it.
    const collectRadius = 1.0;
    for (const crate of state.crates) {
        if (crate.collected) {
            continue;
        }

        const dx = state.player.x - crate.x;
        const dz = state.player.z - crate.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance < collectRadius) {
            crate.collected = true;
            state.score++;

            if (state.crates.every(currentCrate => currentCrate.collected)) {
                const completionTime = currentLevel().timeLimit - state.timeLeft;
                if (!state.bestRecord || completionTime < state.bestRecord.time) {
                    saveBestRecord({
                        time: completionTime,
                        levelName: currentLevel().name,
                        levelNumber: state.levelIndex + 1
                    });
                }

                state.gameOver = true;
                state.won = true;

                if (state.levelIndex < LEVELS.length - 1) {
                    state.pendingAction = `nextLevel`;
                    showOverlay(`${currentLevel().name} complete in ${completionTime.toFixed(1)}s. Press Enter for ${LEVELS[state.levelIndex + 1].name}.`);
                } else {
                    state.pendingAction = `restartGame`;
                    showOverlay(`All levels complete in ${completionTime.toFixed(1)}s on ${currentLevel().name}. Press Enter to play again.`);
                }

                updateHUD();
                return;
            }
        }
    }

    updateHUD();
}

// Sends the cube buffers, texture, and model matrix to WebGL and draws one cube.
function drawCube(texture, modelMatrix) {
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    gl.enableVertexAttribArray(locations.position);
    gl.vertexAttribPointer(locations.position, 3, gl.FLOAT, false, 5*4, 0);

    gl.enableVertexAttribArray(locations.vtexture);
    gl.vertexAttribPointer(locations.vtexture, 2, gl.FLOAT, false, 5*4, 12);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(locations.texture, 0);
    gl.uniformMatrix4fv(locations.model, false, modelMatrix);

    gl.drawElements(gl.TRIANGLES, cubeIndices.length, gl.UNSIGNED_SHORT, 0);
}

// Draws the full scene every frame.
function render() {
    gl.clearColor(0.1, 0.1, 0.15, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const canvas = gl.canvas;
    // Projection depends on the canvas size, so it is rebuilt each frame.
    projectionMatrix = perspective(60 * Math.PI / 180, canvas.width / canvas.height, 0.1, 100.0);

    const eyeX = state.player.x;
    const eyeY = 0.6;
    const eyeZ = state.player.z;

    const targetX = eyeX + Math.sin(state.player.yaw);
    const targetZ = eyeZ - Math.cos(state.player.yaw);

    viewMatrix = view(
        [eyeX, eyeY, eyeZ],
        [targetX, eyeY, targetZ],
        [0, 1, 0]
    );

    gl.uniformMatrix4fv(locations.view, false, viewMatrix);
    gl.uniformMatrix4fv(locations.projection, false, projectionMatrix);

    // Draw all crates that have not been collected yet.
    for (const crate of state.crates) {
        if (crate.collected) {
            continue;
        }

        // Combine rotations, then move the crate into the room.
        const rotationMatrix = multiply(rotZ(crate.rotationZ), multiply(rotY(crate.rotationY), rotX(crate.rotationX)));
        const modelMatrix = multiply(translate(crate.x, 0.5, crate.z), multiply(rotationMatrix, scale(CRATE_SCALE, CRATE_SCALE, CRATE_SCALE)));
        drawCube(crateTexture, modelMatrix);
    }

    // Draw the room after the crates
    drawCube(floorTexture, staticScene.floor);
    drawCube(ceilingTexture, staticScene.ceiling);

    for (const wallModel of staticScene.walls) {
        drawCube(stoneTexture, wallModel);
    }

    for (const mazeWall of state.mazeWalls) {
        drawCube(stoneTexture, mazeWall.modelMatrix);
    }
}

// Main animation loop.
function gameLoop(timestamp) {
    const dt = Math.min((timestamp - state.lastTime) / 1000, 0.05);
    state.lastTime = timestamp;

    update(dt);
    render();

    requestAnimationFrame(gameLoop);
}

// Refreshes the text shown on the HUD.
function updateHUD() {
    document.getElementById(`score`).textContent = `Crates: ${state.score} / ${state.crates.length}`;
    document.getElementById(`timer`).textContent = `Time: ${Math.ceil(state.timeLeft)}`;
    document.getElementById(`level`).textContent = `Level: ${state.levelIndex + 1} / ${LEVELS.length}`;
    const bestLevel = state.bestRecord?.levelNumber
        ? `Level ${state.bestRecord.levelNumber}`
        : state.bestRecord?.levelName || `Unknown level`;
    document.getElementById(`best`).textContent = state.bestRecord
        ? `Best: ${state.bestRecord.time.toFixed(1)}s (${bestLevel})`
        : `Best: --`;
}

// Shows the message overlay for win/lose/next level states.
function showOverlay(message) {
    const overlay = document.getElementById(`overlay`);
    overlay.textContent = message;
    overlay.style.display = `flex`;
}

// Hides the overlay when gameplay resumes.
function hideOverlay() {
    document.getElementById(`overlay`).style.display = `none`;
}

// Hides the start menu once the player begins.
function hideMenu() {
    document.getElementById(`menu-screen`).style.display = `none`;
}

// Start the game.
init();