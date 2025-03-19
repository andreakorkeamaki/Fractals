// Type declarations for modules used in the project

declare module 'react' {
  // Export React hooks that are used in the project
  export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
  export function useRef<T>(initialValue: T): { current: T };
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useMemo<T>(factory: () => T, deps: any[]): T;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  
  // Define React component types
  export type FC<P = {}> = (props: P) => React.ReactElement | null;
  export type ReactElement = any; // Simplified for brevity
}

declare module '@react-three/fiber' {
  import { Camera, Scene, WebGLRenderer } from 'three';
  
  export const Canvas: React.FC<any>;
  export function useFrame(callback: (state: { gl: WebGLRenderer, scene: Scene, camera: Camera, clock: { getElapsedTime: () => number } }) => void, priority?: number): void;
  export function useThree(): { gl: WebGLRenderer, scene: Scene, camera: Camera };
  export function extend(objects: Record<string, any>): void;
}

declare module '@react-three/drei' {
  export const OrbitControls: React.FC<any>;
  export const useGLTF: (path: string) => any;
  export const Environment: React.FC<any>;
  export const Html: React.FC<any>;
  export const TransformControls: React.FC<any>;
  export function shaderMaterial(uniforms: Record<string, any>, vertexShader: string, fragmentShader: string): any;
}

declare module 'three' {
  export class Color {
    constructor(color?: string | number);
    set(color: string | number): this;
    setHex(hex: number): this;
    setRGB(r: number, g: number, b: number): this;
    setHSL(h: number, s: number, l: number): this;
    getHex(): number;
    getHexString(): string;
    toJSON(): number;
  }
  
  export class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    clone(): Vector3;
    setComponent(index: number, value: number): this;
    getComponent(index: number): number;
    normalize(): this;
    divideScalar(scalar: number): this;
  }
  
  export class WebGLRenderer {
    constructor(options?: { antialias?: boolean, alpha?: boolean, preserveDrawingBuffer?: boolean });
    setSize(width: number, height: number): void;
    setClearColor(color: string | number | Color, alpha?: number): void;
    render(scene: Scene, camera: Camera): void;
    domElement: HTMLCanvasElement;
    dispose(): void;
  }
  
  export class Scene {}
  export class Camera {}
  export class PerspectiveCamera extends Camera {
    constructor(fov: number, aspect: number, near: number, far: number);
  }
  
  export class ShaderMaterial {
    constructor(parameters: {
      uniforms?: Record<string, { value: any }>;
      vertexShader?: string;
      fragmentShader?: string;
    });
    uniforms: Record<string, { value: any }>;
  }

  export class BufferGeometry {}
  export class PlaneGeometry extends BufferGeometry {
    constructor(width?: number, height?: number, widthSegments?: number, heightSegments?: number);
  }
  export class BoxGeometry extends BufferGeometry {
    constructor(width?: number, height?: number, depth?: number, widthSegments?: number, heightSegments?: number, depthSegments?: number);
  }

  export class Material {}
  export class MeshStandardMaterial extends Material {
    constructor(parameters?: { color?: string | number | Color, metalness?: number, roughness?: number });
  }
  export class LineBasicMaterial extends Material {
    constructor(parameters?: { color?: string | number | Color });
  }

  export class Mesh {
    constructor(geometry?: BufferGeometry, material?: Material);
    position: Vector3;
    rotation: { x: number, y: number, z: number };
    scale: Vector3;
  }

  export class Group {
    constructor();
    add(...objects: any[]): this;
    position: Vector3;
    rotation: { x: number, y: number, z: number };
    scale: Vector3;
  }

  export class InstancedMesh extends Mesh {
    constructor(geometry?: BufferGeometry, material?: Material, count?: number);
  }

  export class BufferAttribute {
    constructor(array: ArrayLike<number>, itemSize: number, normalized?: boolean);
  }

  export class InstancedBufferAttribute extends BufferAttribute {
    constructor(array: ArrayLike<number>, itemSize: number, normalized?: boolean);
  }

  export class Line {
    constructor(geometry?: BufferGeometry, material?: Material);
  }
}

declare module 'lucide-react' {
  export const Pause: React.FC<any>;
  export const Play: React.FC<any>;
  export const Save: React.FC<any>;
  export const Video: React.FC<any>;
  export const Download: React.FC<any>;
  export const Square: React.FC<any>;
  export const Image: React.FC<any>;
  export const Settings: React.FC<any>;
  export const Palette: React.FC<any>;
  export const RepeatIcon: React.FC<any>;
}

// Declare global JSX namespace to fix JSX element errors
declare namespace JSX {
  interface IntrinsicElements {
    mesh: any;
    boxGeometry: any;
    meshStandardMaterial: any;
    ambientLight: any;
    pointLight: any;
    group: any;
    bufferGeometry: any;
    lineBasicMaterial: any;
    line: any;
    instancedMesh: any;
    planeGeometry: any;
    fractalMaterial: any;
    instancedBufferAttribute: any;
  }
}

// Define interfaces for component props
interface FractalCurvesProps {
  blendFactors: THREE.Vector3;
  blendMethod: number;
  colorSet: number;
  useCustomColors: boolean;
  customColors: {
    start: string;
    middle: string;
    end: string;
  };
  animationSpeed: number;
  elementSize: number;
  depth: number;
  colorAnimationSpeed: number;
  colorInterpolationMethod: number;
}

interface RecordingCaptureProps {
  isRecording: boolean;
  onFrame: (frameData: string) => void;
  recordingArea: {
    width: number;
    height: number;
  };
  backgroundColor: string;
}

// Define MediaRecorder types
interface MediaRecorderOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  videoBitsPerSecond?: number;
  bitsPerSecond?: number;
}

interface MediaRecorderDataAvailableEvent extends Event {
  data: Blob;
}

interface MediaRecorderErrorEvent extends Event {
  name: string;
}

interface MediaRecorder extends EventTarget {
  readonly state: 'inactive' | 'recording' | 'paused';
  readonly stream: MediaStream;
  readonly mimeType: string;
  readonly videoBitsPerSecond: number;
  readonly audioBitsPerSecond: number;
  ondataavailable: ((event: MediaRecorderDataAvailableEvent) => void) | null;
  onerror: ((event: MediaRecorderErrorEvent) => void) | null;
  onpause: ((event: Event) => void) | null;
  onresume: ((event: Event) => void) | null;
  onstart: ((event: Event) => void) | null;
  onstop: ((event: Event) => void) | null;
  start(timeslice?: number): void;
  stop(): void;
  pause(): void;
  resume(): void;
  requestData(): void;
}

interface MediaRecorderConstructor {
  new(stream: MediaStream, options?: MediaRecorderOptions): MediaRecorder;
  isTypeSupported(mimeType: string): boolean;
}

declare var MediaRecorder: MediaRecorderConstructor;
