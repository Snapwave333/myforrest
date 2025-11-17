"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { Noise } from 'noisejs';

// Game constants
const TILE_SIZE = 16;
const CHUNK_SIZE = 32; // 32x32 tiles per chunk
const CHUNK_PIXEL_SIZE = CHUNK_SIZE * TILE_SIZE;
const VIEWPORT_WIDTH = 800;
const VIEWPORT_HEIGHT = 600;
const PLAYER_SPEED = 3;
const RENDER_DISTANCE = 2; // How many chunks around the player to render

// POI types
interface POI {
  x: number;
  y: number;
  type: 'ruin' | 'cave' | 'rune' | 'shrine';
  collected: boolean;
  graphics?: PIXI.Graphics;
}

// Magic fragment types
interface MagicFragment {
  type: 'fire' | 'water' | 'earth' | 'air';
  count: number;
}

// Game state interface
interface GameState {
  playerX: number;
  playerY: number;
  collectedFragments: MagicFragment[];
  unlockedSpells: string[];
  discoveredPOIs: Set<string>;
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    playerX: 0,
    playerY: 0,
    collectedFragments: [
      { type: 'fire', count: 0 },
      { type: 'water', count: 0 },
      { type: 'earth', count: 0 },
      { type: 'air', count: 0 },
    ],
    unlockedSpells: [],
    discoveredPOIs: new Set(),
  });
  const [notification, setNotification] = useState<string>('');

  useEffect(() => {
    if (!canvasRef.current) return;

    // Clean up existing app
    if (appRef.current) {
      appRef.current.destroy(true, { children: true, texture: true });
      appRef.current = null;
    }

    const app = new PIXI.Application({
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT,
      backgroundColor: 0x1099bb,
    });

    appRef.current = app;
    canvasRef.current.appendChild(app.view as HTMLCanvasElement);

    // Initialize noise with a fixed seed for consistent world
    const worldSeed = 12345;
    const terrainNoise = new Noise(worldSeed);
    const poiNoise = new Noise(worldSeed + 1);

    // Game world container (this moves to simulate camera)
    const worldContainer = new PIXI.Container();
    app.stage.addChild(worldContainer);

    // Chunk management
    const loadedChunks = new Map<string, PIXI.Container>();
    const pois: POI[] = [];

    // Player state
    let playerWorldX = 0;
    let playerWorldY = 0;

    // Create player sprite
    const player = new PIXI.Graphics();
    player.beginFill(0xFF0000);
    player.drawCircle(0, 0, 8);
    player.endFill();
    // Add a direction indicator
    player.beginFill(0xFFFFFF);
    player.drawRect(4, -2, 8, 4);
    player.endFill();
    player.x = VIEWPORT_WIDTH / 2;
    player.y = VIEWPORT_HEIGHT / 2;
    app.stage.addChild(player);

    // Input handling
    const keys: { [key: string]: boolean } = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      if (e.key === ' ') {
        checkForPOI();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Generate terrain for a single tile
    function getTileType(worldX: number, worldY: number): number {
      const noiseValue = terrainNoise.simplex2(worldX / 50, worldY / 50);
      if (noiseValue < -0.3) return 0; // Water
      if (noiseValue < -0.1) return 1; // Sand
      if (noiseValue < 0.4) return 2;  // Grass
      if (noiseValue < 0.7) return 3;  // Dense forest
      return 4; // Mountain
    }

    // Get tile color
    function getTileColor(type: number): number {
      switch (type) {
        case 0: return 0x0066CC; // Water
        case 1: return 0xC2B280; // Sand
        case 2: return 0x228B22; // Grass
        case 3: return 0x006400; // Dense forest
        case 4: return 0x8B7355; // Mountain
        default: return 0x000000;
      }
    }

    // Check if tile is walkable
    function isWalkable(worldX: number, worldY: number): boolean {
      const tileType = getTileType(
        Math.floor(worldX / TILE_SIZE),
        Math.floor(worldY / TILE_SIZE)
      );
      return tileType !== 0 && tileType !== 4; // Can't walk on water or mountains
    }

    // Generate a chunk
    function generateChunk(chunkX: number, chunkY: number): PIXI.Container {
      const chunkContainer = new PIXI.Container();
      chunkContainer.x = chunkX * CHUNK_PIXEL_SIZE;
      chunkContainer.y = chunkY * CHUNK_PIXEL_SIZE;

      // Generate terrain
      for (let y = 0; y < CHUNK_SIZE; y++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const worldTileX = chunkX * CHUNK_SIZE + x;
          const worldTileY = chunkY * CHUNK_SIZE + y;
          const tileType = getTileType(worldTileX, worldTileY);

          const tile = new PIXI.Graphics();
          tile.beginFill(getTileColor(tileType));
          tile.drawRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          tile.endFill();

          // Add tree sprites for dense forest
          if (tileType === 3 && Math.random() > 0.7) {
            const tree = new PIXI.Graphics();
            tree.beginFill(0x2F4F2F);
            tree.drawCircle(x * TILE_SIZE + 8, y * TILE_SIZE + 4, 6);
            tree.endFill();
            tree.beginFill(0x8B4513);
            tree.drawRect(x * TILE_SIZE + 6, y * TILE_SIZE + 8, 4, 8);
            tree.endFill();
            chunkContainer.addChild(tile);
            chunkContainer.addChild(tree);
          } else {
            chunkContainer.addChild(tile);
          }
        }
      }

      // Generate POIs for this chunk
      for (let y = 0; y < CHUNK_SIZE; y += 8) {
        for (let x = 0; x < CHUNK_SIZE; x += 8) {
          const worldTileX = chunkX * CHUNK_SIZE + x;
          const worldTileY = chunkY * CHUNK_SIZE + y;
          const poiValue = poiNoise.simplex2(worldTileX / 10, worldTileY / 10);

          // Very rare POI spawn
          if (poiValue > 0.85) {
            const poiKey = `${worldTileX},${worldTileY}`;
            const existingPOI = pois.find(p => p.x === worldTileX && p.y === worldTileY);

            if (!existingPOI) {
              const poiTypes: POI['type'][] = ['ruin', 'cave', 'rune', 'shrine'];
              const poiType = poiTypes[Math.floor(Math.abs(poiValue * 100) % 4)];

              const poi: POI = {
                x: worldTileX,
                y: worldTileY,
                type: poiType,
                collected: gameState.discoveredPOIs.has(poiKey),
              };

              // Create POI visual
              const poiGraphics = new PIXI.Graphics();
              const poiColor = poi.collected ? 0x666666 : getPOIColor(poiType);
              poiGraphics.beginFill(poiColor);

              if (poiType === 'ruin') {
                poiGraphics.drawRect(x * TILE_SIZE, y * TILE_SIZE, 24, 24);
              } else if (poiType === 'cave') {
                poiGraphics.drawCircle(x * TILE_SIZE + 12, y * TILE_SIZE + 12, 14);
              } else if (poiType === 'rune') {
                // Draw a star shape manually
                const cx = x * TILE_SIZE + 12;
                const cy = y * TILE_SIZE + 12;
                const outerRadius = 12;
                const innerRadius = 6;
                const points = 5;
                const starPoints: number[] = [];
                for (let i = 0; i < points * 2; i++) {
                  const radius = i % 2 === 0 ? outerRadius : innerRadius;
                  const angle = (i * Math.PI) / points - Math.PI / 2;
                  starPoints.push(cx + Math.cos(angle) * radius);
                  starPoints.push(cy + Math.sin(angle) * radius);
                }
                poiGraphics.drawPolygon(starPoints);
              } else {
                poiGraphics.drawPolygon([
                  x * TILE_SIZE + 12, y * TILE_SIZE,
                  x * TILE_SIZE + 24, y * TILE_SIZE + 24,
                  x * TILE_SIZE, y * TILE_SIZE + 24,
                ]);
              }
              poiGraphics.endFill();

              poi.graphics = poiGraphics;
              pois.push(poi);
              chunkContainer.addChild(poiGraphics);
            }
          }
        }
      }

      return chunkContainer;
    }

    function getPOIColor(type: POI['type']): number {
      switch (type) {
        case 'ruin': return 0xA0522D;
        case 'cave': return 0x4A4A4A;
        case 'rune': return 0xFFD700;
        case 'shrine': return 0x9370DB;
        default: return 0xFFFFFF;
      }
    }

    // Update visible chunks
    function updateChunks() {
      const playerChunkX = Math.floor(playerWorldX / CHUNK_PIXEL_SIZE);
      const playerChunkY = Math.floor(playerWorldY / CHUNK_PIXEL_SIZE);

      // Load chunks in render distance
      for (let dy = -RENDER_DISTANCE; dy <= RENDER_DISTANCE; dy++) {
        for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
          const chunkX = playerChunkX + dx;
          const chunkY = playerChunkY + dy;
          const key = `${chunkX},${chunkY}`;

          if (!loadedChunks.has(key)) {
            const chunk = generateChunk(chunkX, chunkY);
            loadedChunks.set(key, chunk);
            worldContainer.addChild(chunk);
          }
        }
      }

      // Unload distant chunks
      const chunksToRemove: string[] = [];
      loadedChunks.forEach((chunk, key) => {
        const [cx, cy] = key.split(',').map(Number);
        const dx = Math.abs(cx - playerChunkX);
        const dy = Math.abs(cy - playerChunkY);

        if (dx > RENDER_DISTANCE + 1 || dy > RENDER_DISTANCE + 1) {
          worldContainer.removeChild(chunk);
          chunk.destroy({ children: true });
          chunksToRemove.push(key);
        }
      });
      chunksToRemove.forEach(key => loadedChunks.delete(key));
    }

    // Check for nearby POI
    function checkForPOI() {
      const playerTileX = Math.floor(playerWorldX / TILE_SIZE);
      const playerTileY = Math.floor(playerWorldY / TILE_SIZE);

      for (const poi of pois) {
        const dx = Math.abs(poi.x - playerTileX);
        const dy = Math.abs(poi.y - playerTileY);

        if (dx <= 2 && dy <= 2 && !poi.collected) {
          collectPOI(poi);
          break;
        }
      }
    }

    // Collect POI and award magic fragment
    function collectPOI(poi: POI) {
      poi.collected = true;
      const poiKey = `${poi.x},${poi.y}`;

      // Update POI visual
      if (poi.graphics) {
        poi.graphics.tint = 0x666666;
      }

      // Award magic fragment based on POI type
      const fragmentType = getFragmentType(poi.type);

      setGameState(prev => {
        const newFragments = prev.collectedFragments.map(f => {
          if (f.type === fragmentType) {
            return { ...f, count: f.count + 1 };
          }
          return f;
        });

        const newDiscovered = new Set(prev.discoveredPOIs);
        newDiscovered.add(poiKey);

        // Check for spell unlocks
        const newSpells = [...prev.unlockedSpells];
        for (const fragment of newFragments) {
          if (fragment.count >= 3 && !newSpells.includes(`${fragment.type}ball`)) {
            newSpells.push(`${fragment.type}ball`);
            setNotification(`🔮 Unlocked ${fragment.type.toUpperCase()}BALL spell!`);
            setTimeout(() => setNotification(''), 3000);
          }
        }

        return {
          ...prev,
          collectedFragments: newFragments,
          unlockedSpells: newSpells,
          discoveredPOIs: newDiscovered,
        };
      });

      setNotification(`✨ Found ${poi.type}! +1 ${fragmentType} fragment`);
      setTimeout(() => setNotification(''), 2000);
    }

    function getFragmentType(poiType: POI['type']): MagicFragment['type'] {
      switch (poiType) {
        case 'ruin': return 'earth';
        case 'cave': return 'water';
        case 'rune': return 'fire';
        case 'shrine': return 'air';
        default: return 'earth';
      }
    }

    // Game loop
    app.ticker.add(() => {
      // Handle player movement
      let dx = 0;
      let dy = 0;

      if (keys['w'] || keys['arrowup']) dy -= PLAYER_SPEED;
      if (keys['s'] || keys['arrowdown']) dy += PLAYER_SPEED;
      if (keys['a'] || keys['arrowleft']) dx -= PLAYER_SPEED;
      if (keys['d'] || keys['arrowright']) dx += PLAYER_SPEED;

      // Normalize diagonal movement
      if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
      }

      // Check collision before moving
      const newX = playerWorldX + dx;
      const newY = playerWorldY + dy;

      if (dx !== 0 && isWalkable(newX, playerWorldY)) {
        playerWorldX = newX;
      }
      if (dy !== 0 && isWalkable(playerWorldX, newY)) {
        playerWorldY = newY;
      }

      // Rotate player based on movement direction
      if (dx !== 0 || dy !== 0) {
        player.rotation = Math.atan2(dy, dx);
      }

      // Update camera (world container position)
      worldContainer.x = -playerWorldX + VIEWPORT_WIDTH / 2;
      worldContainer.y = -playerWorldY + VIEWPORT_HEIGHT / 2;

      // Update chunks
      updateChunks();

      // Update game state for React
      setGameState(prev => ({
        ...prev,
        playerX: Math.floor(playerWorldX),
        playerY: Math.floor(playerWorldY),
      }));
    });

    // Initial chunk load
    updateChunks();

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true });
        appRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <div ref={canvasRef} />

      {/* HUD */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '10px',
        borderRadius: '5px',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '12px',
      }}>
        <div>Position: ({gameState.playerX}, {gameState.playerY})</div>
        <div style={{ marginTop: '5px' }}>
          <strong>Magic Fragments:</strong>
          {gameState.collectedFragments.map(f => (
            <div key={f.type} style={{ marginLeft: '10px' }}>
              {f.type}: {f.count}/3 {f.count >= 3 ? '✨' : ''}
            </div>
          ))}
        </div>
        {gameState.unlockedSpells.length > 0 && (
          <div style={{ marginTop: '5px' }}>
            <strong>Spells:</strong>
            {gameState.unlockedSpells.map(spell => (
              <div key={spell} style={{ marginLeft: '10px', color: '#FFD700' }}>
                🔮 {spell}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '10px',
        borderRadius: '5px',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '11px',
      }}>
        <div><strong>Controls:</strong></div>
        <div>WASD / Arrows - Move</div>
        <div>SPACE - Interact with POI</div>
      </div>

      {/* Notification */}
      {notification && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          padding: '20px',
          borderRadius: '10px',
          color: '#FFD700',
          fontFamily: 'monospace',
          fontSize: '16px',
          textAlign: 'center',
          zIndex: 100,
        }}>
          {notification}
        </div>
      )}
    </div>
  );
}
