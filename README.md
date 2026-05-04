# Crate Collector

Crate Collector is a first-person WebGL browser game built with HTML, CSS, and JavaScript. The player moves through a textured 3D room, collects spinning crates, avoids maze walls, and tries to finish each level before the timer runs out.

This project was created as part of my second-year Computer Graphics coursework.

## Features

- First-person 3D movement using WebGL
- Textured crates, floor, ceiling, and walls
- Five levels with increasing difficulty
- Random crate placement with spacing checks
- Maze wall collision detection
- Timer-based level challenge
- Score and level HUD
- Restart button
- Best completion record saved with `localStorage`
- Start menu and win/lose overlay messages

## Controls

| Key | Action |
| --- | --- |
| `W` | Move forward |
| `S` | Move backward |
| `A` | Move left |
| `D` | Move right |
| `Arrow Left` | Turn left |
| `Arrow Right` | Turn right |
| `Enter` | Continue after level messages |

## How To Run

1. Download or clone the repository.
2. Open `index.html` in a web browser.
3. Click **Start Game**.

If the textures do not load correctly from a direct file open, run the project with a local server. For example:

```bash
python -m http.server
```

Then open:

```text
http://localhost:8000
```

## Project Structure

```text
Crate Collector/
|-- index.html
|-- style.css
|-- game.js
|-- gl.js
|-- math.js
|-- textures/
|   |-- background.jpg
|   |-- ceiling1.png
|   |-- crate1.png
|   |-- floor1.png
|   `-- wall1.png
`-- README.md
```

## Technologies Used

- HTML5
- CSS3
- JavaScript
- WebGL

## Game Objective

Collect all the crates in each level before time runs out. Each level increases the number of crates, changes the maze layout, and gives the player less time to complete the challenge.

## What I Learned

While building this project, I practiced:

- Creating and rendering 3D objects in WebGL
- Using vertex and fragment shaders
- Applying textures to cube geometry
- Building a simple first-person camera
- Handling keyboard input
- Creating collision detection for walls and collectibles
- Managing game state across multiple levels
- Saving browser data with `localStorage`

## Future Improvements

- Add sound effects for collecting crates and completing levels
- Add mouse-look camera controls
- Add a final game summary screen
- Add particle effects when a crate is collected
- Add a mini-map or direction indicator
- Improve mobile responsiveness
