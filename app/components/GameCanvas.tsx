"use client";

import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { Noise } from 'noisejs';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);

  useEffect(() => {
    // 1. Initialize Pixi
    if (!canvasRef.current) return;

    // Clean up existing app if present
    if (appRef.current) {
      appRef.current.destroy(true, { children: true, texture: true });
      appRef.current = null;
    }

    const app = new PIXI.Application({
      width: 800,
      height: 600,
      backgroundColor: 0x1099bb, // Fallback sky blue
    });

    appRef.current = app;

    // Add the Pixi canvas to our div
    canvasRef.current.appendChild(app.view as HTMLCanvasElement);

    // 2. Initialize Noise
    const noise = new Noise(Math.random()); // New seed every time
    const TILE_SIZE = 16;
    const CHUNK_WIDTH = 800 / TILE_SIZE;
    const CHUNK_HEIGHT = 600 / TILE_SIZE;

    // 3. Generate the World!
    const container = new PIXI.Container();
    app.stage.addChild(container);

    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let x = 0; x < CHUNK_WIDTH; x++) {
        // Get the noise value for this coordinate.
        // We divide by a 'scale' (e.g., 25) to make the terrain "zoomed in."
        // Smaller scale = bigger, smoother continents.
        const noiseValue = noise.simplex2(x / 25, y / 25);

        // This value is between -1 and 1. Let's map it.
        const graphics = new PIXI.Graphics();

        if (noiseValue < -0.2) {
          graphics.beginFill(0x0000FF); // Deep Water
        } else if (noiseValue < 0) {
          graphics.beginFill(0xFFFF00); // Sand
        } else if (noiseValue < 0.5) {
          graphics.beginFill(0x008000); // Grass
        } else {
          graphics.beginFill(0x8B4513); // Dirt/Mountain
        }

        graphics.drawRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        graphics.endFill();
        container.addChild(graphics);
      }
    }

    // 4. Cleanup on component unmount
    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true });
        appRef.current = null;
      }
    };

  }, []); // Empty array means this runs once on mount

  // This ref is where Pixi will attach its canvas
  return <div ref={canvasRef} />;
}
