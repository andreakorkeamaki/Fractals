/// <reference path="../types/leva.d.ts" />

import React, { useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, extend } from "@react-three/fiber"
import { shaderMaterial } from "@react-three/drei"

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

const FractalMaterial = shaderMaterial(
  {
    time: 0,
    blendFactors: new THREE.Vector3(0.33, 0.33, 0.34),
    blendMethod: 0,
    colorSet: 0,
    useCustomColors: false,
    customColorStart: new THREE.Color(0x000000),
    customColorMiddle: new THREE.Color(0x7f7f7f),
    customColorEnd: new THREE.Color(0xffffff),
    animationSpeed: 1,
    elementSize: 0.04,
    depth: 1,
    colorAnimationSpeed: 1,
    colorInterpolationMethod: 0,
  },
  // Vertex Shader
  `
  attribute float index;
  uniform float time;
  uniform vec3 blendFactors;
  uniform int blendMethod;
  uniform float animationSpeed;
  uniform float elementSize;
  uniform float depth;
  
  varying vec3 vColor;
  varying float vIndex;
  
  vec3 spiral(float t, float angle) {
    return vec3(
      sin(angle) * (0.5 + t * 0.5),
      cos(angle) * (0.5 + t * 0.5),
      t * 2.0 - 1.0
    );
  }
  
  vec3 mobius(float t, float angle) {
    return vec3(
      sin(angle) * (0.5 + t * 0.5),
      cos(angle) * (0.5 + t * 0.5),
      sin(angle * 2.0) * 0.2
    );
  }
  
  vec3 trefoil(float t, float angle) {
    float p = 2.0, q = 3.0;
    return vec3(
      (2.0 + cos(q * angle)) * cos(p * angle),
      (2.0 + cos(q * angle)) * sin(p * angle),
      sin(q * angle)
    ) * 0.3;
  }
  
  float linearStep(float edge0, float edge1, float x) {
    return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  }
  
  vec3 blendFractals(vec3 a, vec3 b, vec3 c, vec3 factors, int method, vec2 uv) {
    if (method == 0) {
      // Linear interpolation
      return a * factors.x + b * factors.y + c * factors.z;
    } else if (method == 1) {
      // Smooth step interpolation
      float t = smoothstep(0.0, 1.0, uv.x);
      vec3 ab = mix(a, b, t);
      return mix(ab, c, smoothstep(0.0, 1.0, uv.y));
    } else {
      // Radial blend
      float dist = length(uv - 0.5);
      float t = linearStep(0.0, 0.5, dist);
      vec3 ab = mix(a, b, t);
      return mix(ab, c, smoothstep(0.0, 1.0, dist * 2.0));
    }
  }
  
  void main() {
    float total = 5000.0;
    float t = index / total;
    float angle = t * 2.0 * 3.14159 * 8.0 + time * animationSpeed;
    
    vec3 pos1 = spiral(t, angle);
    vec3 pos2 = mobius(t, angle);
    vec3 pos3 = trefoil(t, angle);
    
    vec3 pos = blendFractals(pos1, pos2, pos3, blendFactors, blendMethod, vec2(t, 0.5));
    
    vec3 nextPos = blendFractals(
      spiral(t + 1.0/total, angle),
      mobius(t + 1.0/total, angle),
      trefoil(t + 1.0/total, angle),
      blendFactors, blendMethod, vec2(t + 1.0/total, 0.5)
    );
    
    vec3 dir = normalize(nextPos - pos);
    vec3 up = normalize(cross(dir, vec3(0.0, 1.0, 0.0)));
    vec3 right = normalize(cross(up, dir));
    
    pos *= depth;
    
    // Implementazione del billboarding
    vec3 cameraRight = normalize(vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]));
    vec3 cameraUp = normalize(vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]));
    
    pos += (position.x * cameraRight + position.y * cameraUp) * elementSize;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    
    vColor = vec3(t, t, t);
    vIndex = index;
  }
  `,
  // Fragment Shader 
  `
  uniform float time;
  uniform int colorSet;
  uniform bool useCustomColors;
  uniform vec3 customColorStart;
  uniform vec3 customColorMiddle;
  uniform vec3 customColorEnd;
  uniform float colorAnimationSpeed;
  uniform int colorInterpolationMethod;
  
  varying vec3 vColor;
  varying float vIndex;
  
  vec3 palette(float t) {
    vec3 a, b, c, d;
    
    if (colorSet == 0) {
      // Rainbow palette
      a = vec3(0.5, 0.5, 0.5);
      b = vec3(0.5, 0.5, 0.5);
      c = vec3(1.0, 1.0, 1.0);
      d = vec3(0.0, 0.33, 0.67);
    } else if (colorSet == 1) {
      // Electric palette
      a = vec3(0.5, 0.5, 0.5);
      b = vec3(0.5, 0.5, 0.5);
      c = vec3(1.0, 1.0, 1.0);
      d = vec3(0.1, 0.4, 0.8);
    } else {
      // Pastel palette
      a = vec3(0.5, 0.5, 0.5);
      b = vec3(0.5, 0.5, 0.5);
      c = vec3(1.0, 0.7, 0.4);
      d = vec3(0.0, 0.15, 0.2);
    }
    
    if (useCustomColors) {
      // Custom interpolation between three colors
      float adjustedT = t * 2.0;
      if (colorInterpolationMethod == 0) {
        // Linear interpolation
        if (adjustedT < 1.0) {
          return mix(customColorStart, customColorMiddle, adjustedT);
        } else {
          return mix(customColorMiddle, customColorEnd, adjustedT - 1.0);
        }
      } else {
        // Smooth interpolation
        if (adjustedT < 1.0) {
          float smoothT = smoothstep(0.0, 1.0, adjustedT);
          return mix(customColorStart, customColorMiddle, smoothT);
        } else {
          float smoothT = smoothstep(0.0, 1.0, adjustedT - 1.0);
          return mix(customColorMiddle, customColorEnd, smoothT);
        }
      }
    }
    
    return a + b * cos(6.28318 * (c * t + d + time * 0.1 * colorAnimationSpeed));
  }
  
  void main() {
    gl_FragColor = vec4(palette(vIndex / 5000.0), 1.0);
  }
  `
);

extend({ FractalMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      fractalMaterial: any;
    }
  }
}

export function FractalCurves({
  blendFactors,
  blendMethod,
  colorSet,
  useCustomColors,
  customColors,
  animationSpeed,
  elementSize,
  depth,
  colorAnimationSpeed,
  colorInterpolationMethod,
}: FractalCurvesProps) {
  const geom = React.useRef<THREE.BufferGeometry | null>(null);
  const matRef = React.useRef<any>(null);
  const meshRef = React.useRef<THREE.InstancedMesh | null>(null);
  const numElements = 5000;

  useEffect(() => {
    if (geom.current && matRef.current) {
      matRef.current.customColorStart = new THREE.Color(customColors.start);
      matRef.current.customColorMiddle = new THREE.Color(customColors.middle);
      matRef.current.customColorEnd = new THREE.Color(customColors.end);
    }
  }, [customColors]);

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.time = clock.getElapsedTime();
      matRef.current.blendFactors = blendFactors;
      matRef.current.blendMethod = blendMethod;
      matRef.current.colorSet = colorSet;
      matRef.current.useCustomColors = useCustomColors;
      matRef.current.animationSpeed = animationSpeed;
      matRef.current.elementSize = elementSize;
      matRef.current.depth = depth;
      matRef.current.colorAnimationSpeed = colorAnimationSpeed;
      matRef.current.colorInterpolationMethod = colorInterpolationMethod;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[null!, null!, numElements]} frustumCulled={false}>
      <planeGeometry ref={geom} args={[1, 1]} />
      <fractalMaterial ref={matRef} transparent={true} />
    </instancedMesh>
  );
}

export default FractalCurves;
