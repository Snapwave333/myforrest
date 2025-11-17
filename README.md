# My Forrest

An endless, procedurally generated forest exploration game built with Next.js and PixiJS.

## Features

- **Procedural Generation**: Uses Simplex noise to generate unique terrain on every load
- **2D Rendering**: Powered by PixiJS for fast, efficient canvas rendering
- **Infinite World**: Designed for chunk-based loading as the player explores

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the procedurally generated world.

## Technology Stack

- **Next.js** - React framework for the application
- **PixiJS** - 2D rendering engine
- **noisejs** - Simplex noise for procedural terrain generation

## Game Concept

- **Explore**: Move through the endless forest, revealing new chunks of terrain
- **Discover**: Find Points of Interest like ancient ruins, glowing runes, or hidden caves
- **Learn**: Unlock lore and fragments of magic through discoveries
- **Harness**: Collect magic fragments to unlock new spells and access new areas

## Next Steps

- Add a player character sprite
- Implement keyboard controls for movement
- Create a camera system that follows the player
- Implement chunk loading/unloading as the player moves
- Add Points of Interest generation
- Create a magic/skill system
