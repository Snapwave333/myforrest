declare module 'noisejs' {
  export class Noise {
    constructor(seed?: number);
    seed(seed: number): void;
    simplex2(x: number, y: number): number;
    simplex3(x: number, y: number, z: number): number;
    perlin2(x: number, y: number): number;
    perlin3(x: number, y: number, z: number): number;
  }
}
