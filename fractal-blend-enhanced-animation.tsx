/// <reference path="./types/leva.d.ts" />

// Aggiungere dichiarazioni di tipo per i moduli mancanti all'inizio del file
"use client"

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, extend, useThree } from "@react-three/fiber"
import { OrbitControls, shaderMaterial } from "@react-three/drei"
import { useControls, button, folder } from "leva"
import { saveAs } from "file-saver"
import { Button } from "./components/ui/button"
import { Switch } from "./components/ui/switch"
import { Label } from "./components/ui/label"
import { Slider } from "./components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card"
import { Settings, Palette, Download, Square, Video as Record } from "lucide-react"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./components/ui/select"
import { RadioGroup, RadioGroupItem } from "./components/ui/radio-group"
import { Progress } from "./components/ui/progress"
import { Input } from "./components/ui/input"

declare global {
  namespace JSX {
    interface IntrinsicElements {
      instancedMesh: any;
      planeGeometry: any;
      fractalMaterial: any;
      instancedBufferAttribute: any;
    }
  }
}

interface RecordingResolution {
  width: number;
  height: number;
}

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

interface CustomColors {
  start: string;
  middle: string;
  end: string;
  [key: string]: string;
}

// Define a custom interface for the fractal material with uniforms
interface FractalMaterialType extends THREE.ShaderMaterial {
  uniforms: {
    time: { value: number };
    blendFactors: { value: THREE.Vector3 };
    blendMethod: { value: number };
    colorSet: { value: number };
    useCustomColors: { value: boolean };
    customColorStart: { value: THREE.Color };
    customColorMiddle: { value: THREE.Color };
    customColorEnd: { value: THREE.Color };
    animationSpeed: { value: number };
    elementSize: { value: number };
    depth: { value: number };
    colorAnimationSpeed: { value: number };
    colorInterpolationMethod: { value: number };
  };
}

// Define a custom interface for the mesh with our custom material
interface FractalInstancedMesh extends THREE.InstancedMesh {
  material: FractalMaterialType;
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
    if (useCustomColors) {
      vec3 color1 = customColorStart;
      vec3 color2 = customColorMiddle;
      vec3 color3 = customColorEnd;
      
      float animatedT = fract(t + time * colorAnimationSpeed * 0.1);
      
      if (colorInterpolationMethod == 0) {
        // Linear interpolation
        if (animatedT < 0.5) {
          return mix(color1, color2, animatedT * 2.0);
        } else {
          return mix(color2, color3, (animatedT - 0.5) * 2.0);
        }
      } else {
        // Smooth interpolation
        if (animatedT < 0.5) {
          return mix(color1, color2, smoothstep(0.0, 1.0, animatedT * 2.0));
        } else {
          return mix(color2, color3, smoothstep(0.0, 1.0, (animatedT - 0.5) * 2.0));
        }
      }
    } else if (colorSet == 0) {
      a = vec3(0.5, 0.5, 0.5);
      b = vec3(0.5, 0.5, 0.5);
      c = vec3(1.0, 1.0, 1.0);
      d = vec3(0.263,0.416,0.557);
    } else if (colorSet == 1) {
      a = vec3(0.5, 0.5, 0.5);
      b = vec3(0.5, 0.5, 0.5);
      c = vec3(1.0, 1.0, 0.5);
      d = vec3(0.8,0.9,0.3);
    } else {
      a = vec3(0.5, 0.5, 0.5);
      b = vec3(0.5, 0.5, 0.5);
      c = vec3(1.0, 0.7, 1.0);
      d = vec3(0.0,0.15,0.2);
    }
    return a + b*cos( 6.28318*(c*t+d + time * colorAnimationSpeed * 0.1) );
  }
  
  void main() {
    float t = vColor.x;
    vec3 color = palette(t);
    
    // Add pulsing effect
    float pulse = sin(time * 2.0 + vIndex * 0.01) * 0.5 + 0.5;
    color = mix(color, color * 1.5, pulse);
    
    gl_FragColor = vec4(color, 1.0);
  }
  `,
)

extend({ FractalMaterial })

const FractalCurves: React.FC<FractalCurvesProps> = ({
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
}) => {
  const mesh = useRef<FractalInstancedMesh | null>(null);
  const instanceCount = 5000;

  const indices = useMemo(() => {
    const temp = new Float32Array(instanceCount);
    for (let i = 0; i < instanceCount; i++) {
      temp[i] = i;
    }
    return temp;
  }, []);

  useEffect(() => {
    if (mesh.current) {
      mesh.current.material.uniforms.time.value = 0;
    }
  }, []);

  useEffect(() => {
    if (mesh.current) {
      const vector = mesh.current.material.uniforms.blendFactors.value;
      vector.x = blendFactors.x;
      vector.y = blendFactors.y;
      vector.z = blendFactors.z;
    }
  }, [blendFactors]);

  useEffect(() => {
    if (mesh.current) {
      mesh.current.material.uniforms.blendMethod.value = blendMethod;
    }
  }, [blendMethod]);

  useEffect(() => {
    if (mesh.current) {
      mesh.current.material.uniforms.colorSet.value = colorSet;
    }
  }, [colorSet]);

  useEffect(() => {
    if (mesh.current) {
      mesh.current.material.uniforms.useCustomColors.value = useCustomColors;
    }
  }, [useCustomColors]);

  useEffect(() => {
    if (mesh.current) {
      mesh.current.material.uniforms.customColorStart.value = new THREE.Color(customColors.start);
    }
  }, [customColors.start]);

  useEffect(() => {
    if (mesh.current) {
      mesh.current.material.uniforms.customColorMiddle.value = new THREE.Color(customColors.middle);
    }
  }, [customColors.middle]);

  useEffect(() => {
    if (mesh.current) {
      mesh.current.material.uniforms.customColorEnd.value = new THREE.Color(customColors.end);
    }
  }, [customColors.end]);

  useEffect(() => {
    if (mesh.current) {
      mesh.current.material.uniforms.animationSpeed.value = animationSpeed;
    }
  }, [animationSpeed]);

  useEffect(() => {
    if (mesh.current) {
      mesh.current.material.uniforms.elementSize.value = elementSize;
    }
  }, [elementSize]);

  useEffect(() => {
    if (mesh.current) {
      mesh.current.material.uniforms.depth.value = depth;
    }
  }, [depth]);

  useEffect(() => {
    if (mesh.current) {
      mesh.current.material.uniforms.colorAnimationSpeed.value = colorAnimationSpeed;
    }
  }, [colorAnimationSpeed]);

  useEffect(() => {
    if (mesh.current) {
      mesh.current.material.uniforms.colorInterpolationMethod.value = colorInterpolationMethod;
    }
  }, [colorInterpolationMethod]);

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.material.uniforms.time.value = state.clock.getElapsedTime();
    }
  });

  return (
    <instancedMesh ref={mesh} args={[null! as any, null! as any, instanceCount]}>
      <planeGeometry args={[1, 0.1, 1, 1]} />
      <fractalMaterial />
      <instancedBufferAttribute attach="geometry-attributes-index" args={[indices, 1]} />
    </instancedMesh>
  );
};

interface RecordingCaptureProps {
  isRecording: boolean;
  onFrame: (frameData: string) => void;
  recordingArea: RecordingResolution;
  backgroundColor: string;
}

const RecordingCapture: React.FC<RecordingCaptureProps> = ({ isRecording, onFrame, recordingArea, backgroundColor }) => {
  const { scene, camera } = useThree();
  const frameRef = useRef<number>(0);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isRecording) {
      offscreenCanvasRef.current = document.createElement("canvas");
      if (offscreenCanvasRef.current) {
        offscreenCanvasRef.current.width = recordingArea.width;
        offscreenCanvasRef.current.height = recordingArea.height;

        rendererRef.current = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false,
          preserveDrawingBuffer: true,
        });
        
        if (rendererRef.current) {
          rendererRef.current.domElement = offscreenCanvasRef.current;
          
          const bgColor = new THREE.Color(backgroundColor);
          rendererRef.current.setClearColor(bgColor, 1.0);
          rendererRef.current.setSize(recordingArea.width, recordingArea.height);
        }
      }
    } else {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      offscreenCanvasRef.current = null;
    }

    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      offscreenCanvasRef.current = null;
    };
  }, [isRecording, recordingArea.width, recordingArea.height, backgroundColor]);

  useFrame(() => {
    if (isRecording && rendererRef.current && offscreenCanvasRef.current) {
      frameRef.current += 1;
      if (frameRef.current % 2 !== 0) return;

      const bgColor = new THREE.Color(backgroundColor);
      rendererRef.current.setClearColor(bgColor, 1.0);
      
      rendererRef.current.render(scene, camera);

      const dataUrl = offscreenCanvasRef.current.toDataURL("image/png");
      onFrame(dataUrl);
    }
  });

  return null;
}

function downloadPngSequence(frames: string[], onProgress: (progress: number) => void) {
  return new Promise((resolve) => {
    let downloadedCount = 0
    const totalFrames = frames.length
    
    const batchSize = 5
    let currentBatch = 0
    
    const processBatch = () => {
      const startIdx = currentBatch * batchSize
      const endIdx = Math.min(startIdx + batchSize, totalFrames)
      
      for (let i = startIdx; i < endIdx; i++) {
        const paddedIndex = String(i).padStart(5, "0")
        const filename = `fractal-frame-${paddedIndex}.png`

        const link = document.createElement("a")
        link.href = frames[i]
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        downloadedCount++
      }
      
      onProgress(Math.floor((downloadedCount / totalFrames) * 100))
      
      currentBatch++
      if (startIdx + batchSize < totalFrames) {
        setTimeout(processBatch, 300)
      } else {
        resolve(true)
      }
    }
    
    processBatch()
  })
}

async function createVideo(frames: string[], format: 'mp4' | 'webm', frameRate: number, onProgress: (progress: number) => void, bitrate = 8) {
  return new Promise<string>(async (resolve, reject) => {
    try {
      const canvas = document.createElement("canvas")
      const img = new Image()
      
      canvas.width = 1920
      canvas.height = 1080
      const ctx = canvas.getContext("2d")
      
      if (!ctx) {
        reject(new Error("Could not get canvas context"))
        return
      }

      const mimeTypes: { [key: string]: string } = {
        webm: "video/webm",
        mp4: "video/mp4",
      };

      const encoderOptions: { [key: string]: any } = {
        webm: ["vp9", {
          framerate: frameRate,
          bitrate: bitrate * 1000000,
          width: canvas.width,
          height: canvas.height,
        }],
        mp4: ["avc1.42E01E", { 
          framerate: frameRate,
          bitrate: bitrate * 1000000,
          width: canvas.width,
          height: canvas.height,
        }],
      };
      
      await new Promise<void>((resolveFirstFrame) => {
        img.onload = () => {
          canvas.width = img.width
          canvas.height = img.height
          resolveFirstFrame()
        }
        img.src = frames[0]
      })

      const stream = canvas.captureStream(frameRate)
      const recorder = new MediaRecorder(stream, {
        mimeType: mimeTypes[format],
        videoBitsPerSecond: bitrate * 1000000,
      })

      const chunks: Blob[] = []

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      }

      recorder.onstop = () => {
        const videoBlob = new Blob(chunks, { type: mimeTypes[format] })
        const videoUrl = URL.createObjectURL(videoBlob)
        resolve(videoUrl)
      }

      recorder.start()

      const batchSize = 10
      let processedCount = 0
      
      for (let i = 0; i < frames.length; i += batchSize) {
        const batch = frames.slice(i, i + batchSize)
        
        for (const frame of batch) {
          try {
            await new Promise<void>((resolveFrame) => {
              img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height)
                ctx.drawImage(img, 0, 0)
                resolveFrame()
              }
              img.onerror = () => {
                console.error("Error loading image", frame)
                resolveFrame()
              }
              img.src = frame
            })
            
            processedCount++
            onProgress(processedCount / frames.length)
          } catch (err) {
            console.error("Error processing frame", err)
          }
        }
        
        await new Promise((r) => setTimeout(r, 1))
      }

      recorder.stop()
    } catch (error) {
      reject(error)
    }
  })
}

function downloadSinglePng(dataUrl: string, filename: string) {
  const link = document.createElement("a")
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export default function FractalGenerator() {
  const [blendFactors, setBlendFactors] = useState(new THREE.Vector3(0.33, 0.33, 0.34))
  const [blendMethod, setBlendMethod] = useState(0)
  const [colorSet, setColorSet] = useState(0)
  const [useCustomColors, setUseCustomColors] = useState(false)
  const [customColors, setCustomColors] = useState<CustomColors>({
    start: "#000000",
    middle: "#7F7F7F",
    end: "#FFFFFF",
  })
  const [showSettings, setShowSettings] = useState(false)
  const [backgroundColor, setBackgroundColor] = useState("#000000")
  const [animationSpeed, setAnimationSpeed] = useState(1)
  const [elementSize, setElementSize] = useState(0.04)
  const [depth, setDepth] = useState(1)
  const [colorAnimationSpeed, setColorAnimationSpeed] = useState(1)
  const [colorInterpolationMethod, setColorInterpolationMethod] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [exportFormat, setExportFormat] = useState("png-sequence")
  const [exportProgress, setExportProgress] = useState(0)
  const [recordingFrames, setRecordingFrames] = useState<string[]>([])
  const [recordingDuration, setRecordingDuration] = useState(5)
  const [showRecordingControls, setShowRecordingControls] = useState(false)
  const [recordingResolution, setRecordingResolution] = useState<RecordingResolution>({ width: 1920, height: 1080 })
  const [isExporting, setIsExporting] = useState(false)
  const [frameRate, setFrameRate] = useState(24)
  const [videoBitrate, setVideoBitrate] = useState(8)

  const updateBlendFactor = (index: number, value: number) => {
    const newFactors = blendFactors.clone()
    newFactors.setComponent(index, value)
    const sum = newFactors.x + newFactors.y + newFactors.z
    newFactors.divideScalar(sum)
    setBlendFactors(newFactors)
  }

  const handleCustomColorChange = (colorKey: keyof CustomColors, value: string) => {
    setCustomColors(prev => ({
      ...prev,
      [colorKey]: value
    }));
  }

  const updateResolution = (dimension: keyof RecordingResolution, value: string) => {
    const numValue = Number.parseInt(value, 10)
    
    if (!isNaN(numValue) && numValue > 0 && numValue <= 8192) {
      setRecordingResolution((prev: RecordingResolution) => ({
        ...prev,
        [dimension]: numValue
      }));
    } else {
      console.warn(`Invalid ${dimension} value: ${value}. Must be a positive number between 1 and 8192.`)
      if (isNaN(numValue) || numValue <= 0) {
        const defaultValue = dimension === "width" ? 1920 : 1080
        setRecordingResolution((prev: RecordingResolution) => ({
          ...prev,
          [dimension]: defaultValue
        }));
      }
    }
  }

  const startRecording = useCallback(() => {
    setRecordingFrames([])
    setIsRecording(true)
    setExportProgress(0)
  }, [])

  const stopRecording = useCallback(() => {
    setIsRecording(false)
  }, [])

  const captureFrame = useCallback(
    (frameData: string) => {
      setRecordingFrames((prev: string[]) => [...prev, frameData])

      const expectedFrames = recordingDuration * frameRate
      const progress = Math.min(100, (recordingFrames.length / expectedFrames) * 100)
      setExportProgress(progress)
      
      if (recordingFrames.length >= expectedFrames) {
        stopRecording()
      }
    },
    [recordingFrames.length, recordingDuration, frameRate, stopRecording],
  )

  const handleExport = useCallback(async () => {
    if (recordingFrames.length === 0) {
      alert("No frames to export")
      return
    }

    setIsExporting(true)
    let result: string | Blob
    let filename = ""

    setExportProgress(0)

    if (exportFormat === "png") {
      await downloadPngSequence(recordingFrames, setExportProgress)
      setExportProgress(1)
      setIsExporting(false)
      return
    } else if (exportFormat === "webm" || exportFormat === "mp4") {
      const videoUrl = await createVideo(recordingFrames, exportFormat, frameRate, setExportProgress, videoBitrate)
      filename = `fractal-animation-${Date.now()}.${exportFormat}`

      const link = document.createElement("a")
      link.href = videoUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setTimeout(() => URL.revokeObjectURL(videoUrl), 100)
      
      console.log(`Video created with codec: ${exportFormat}`)
    }

    setIsExporting(false)
  }, [recordingFrames, exportFormat, frameRate, videoBitrate])

  const handleFormatChange = (value: string) => {
    setExportFormat(value as 'png' | 'webm' | 'mp4' | 'png-sequence');
  };

  const handleBitrateChange = (value: number) => {
    setVideoBitrate(value);
  };

  const handleFrameRateChange = (value: number) => {
    setFrameRate(value);
  };

  const handleElementSizeChange = (value: number) => {
    setElementSize(value);
  };

  const handleDepthChange = (value: number) => {
    setDepth(value);
  };

  const handleColorAnimationSpeedChange = (value: number) => {
    setColorAnimationSpeed(value);
  };

  const handleColorSchemeChange = (index: number) => {
    setColorInterpolationMethod(index);
  };

  return (
    <div className="relative w-full h-screen" style={{ backgroundColor }}>
      <Canvas camera={{ position: [0, 0, 3], fov: 75 }}>
        <FractalCurves
          blendFactors={blendFactors}
          blendMethod={blendMethod}
          colorSet={colorSet}
          useCustomColors={useCustomColors}
          customColors={customColors}
          animationSpeed={animationSpeed}
          elementSize={elementSize}
          depth={depth}
          colorAnimationSpeed={colorAnimationSpeed}
          colorInterpolationMethod={colorInterpolationMethod}
        />
        <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} />
        <RecordingCapture
          isRecording={isRecording}
          onFrame={captureFrame}
          recordingArea={recordingResolution}
          backgroundColor={backgroundColor}
        />
      </Canvas>
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <Button
          onClick={() => setShowSettings(!showSettings)}
          className="rounded-full p-2"
          aria-label="Toggle settings"
        >
          <Settings className="w-6 h-6" />
        </Button>
        <Button
          onClick={() => setShowRecordingControls(!showRecordingControls)}
          className="rounded-full p-2"
          aria-label="Toggle recording controls"
        >
          <Record className="w-6 h-6" />
        </Button>
        {showSettings && (
          <Card className="w-80 bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Fractal Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="fractal">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="fractal">
                    <Settings className="w-4 h-4 mr-2" />
                    Fractal
                  </TabsTrigger>
                  <TabsTrigger value="color">
                    <Palette className="w-4 h-4 mr-2" />
                    Color
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="fractal" className="mt-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="mb-2 font-semibold">Blend Factors</h4>
                      {["Spiral", "Mobius", "Trefoil"].map((name, index) => (
                        <div key={name} className="flex items-center mb-2">
                          <Label className="w-16">{name}</Label>
                          <Slider
                            min={0}
                            max={1}
                            step={0.01}
                            value={[blendFactors.getComponent(index)]}
                            onValueChange={(value: number[]) => updateBlendFactor(index, value[0])}
                            className="w-32"
                          />
                          <span className="w-12 text-right text-sm">{blendFactors.getComponent(index).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h4 className="mb-2 font-semibold">Blend Method</h4>
                      <div className="flex space-x-2">
                        {["Linear", "Smooth Step", "Radial"].map((method, index) => (
                          <Button
                            key={method}
                            onClick={() => setBlendMethod(index)}
                            variant={blendMethod === index ? "default" : "outline"}
                            size="sm"
                          >
                            {method}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="mb-2 font-semibold">Animation Speed</h4>
                      <Slider
                        min={0.1}
                        max={5}
                        step={0.1}
                        value={[animationSpeed]}
                        onValueChange={(value: number[]) => setAnimationSpeed(value[0])}
                        className="w-full"
                      />
                      <span className="text-sm">{animationSpeed.toFixed(1)}</span>
                    </div>
                    <div>
                      <h4 className="mb-2 font-semibold">Element Size</h4>
                      <Slider
                        min={0.01}
                        max={0.1}
                        step={0.01}
                        value={[elementSize]}
                        onValueChange={(value: number[]) => handleElementSizeChange(value[0])}
                        className="w-full"
                      />
                      <span className="text-sm">{elementSize.toFixed(2)}</span>
                    </div>
                    <div>
                      <h4 className="mb-2 font-semibold">Depth</h4>
                      <Slider
                        min={0.5}
                        max={2}
                        step={0.1}
                        value={[depth]}
                        onValueChange={(value: number[]) => handleDepthChange(value[0])}
                        className="w-full"
                      />
                      <span className="text-sm">{depth.toFixed(1)}</span>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="color" className="mt-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="mb-2 font-semibold">Color Mode</h4>
                      <div className="flex items-center space-x-2">
                        <Switch id="custom-colors" checked={useCustomColors} onCheckedChange={setUseCustomColors} />
                        <Label htmlFor="custom-colors">Use Custom Colors</Label>
                      </div>
                    </div>
                    {useCustomColors ? (
                      <div>
                        {["start", "middle", "end"].map((key) => (
                          <div key={key} className="flex items-center mb-2">
                            <Label className="w-16 capitalize">{key}</Label>
                            <Input
                              type="color"
                              value={customColors[key as keyof CustomColors]}
                              onChange={(e: { target: { value: string } }) => handleCustomColorChange(key as keyof CustomColors, e.target.value)}
                              className="w-8 h-8 p-0 border-none"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div>
                        <h4 className="mb-2 font-semibold">Color Set</h4>
                        <div className="flex space-x-2">
                          {[0, 1, 2].map((set) => (
                            <Button
                              key={set}
                              onClick={() => setColorSet(set)}
                              variant={colorSet === set ? "default" : "outline"}
                              size="sm"
                            >
                              Set {set + 1}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <h4 className="mb-2 font-semibold">Color Animation Speed</h4>
                      <Slider
                        min={0.1}
                        max={5}
                        step={0.1}
                        value={[colorAnimationSpeed]}
                        onValueChange={(value: number[]) => handleColorAnimationSpeedChange(value[0])}
                        className="w-full"
                      />
                      <span className="text-sm">{colorAnimationSpeed.toFixed(1)}</span>
                    </div>
                    <div>
                      <h4 className="mb-2 font-semibold">Color Interpolation</h4>
                      <div className="flex space-x-2">
                        {["Linear", "Smooth"].map((method, index) => (
                          <Button
                            key={method}
                            onClick={() => handleColorSchemeChange(index)}
                            variant={colorInterpolationMethod === index ? "default" : "outline"}
                            size="sm"
                          >
                            {method}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="mb-2 font-semibold">Background Color</h4>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="color"
                          value={backgroundColor}
                          onChange={(e: { target: { value: string } }) => setBackgroundColor(e.target.value)}
                          className="w-8 h-8 p-0 border-none"
                        />
                        <span className="text-sm">{backgroundColor}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
        {showRecordingControls && (
          <Card className="w-80 bg-white/90 backdrop-blur-sm mt-2">
            <CardHeader>
              <CardTitle>Recording</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="mb-2 font-semibold">Export Format</h4>
                  <Select value={exportFormat} onValueChange={handleFormatChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="webm">WebM Video</SelectItem>
                      <SelectItem value="mp4">MP4 Video</SelectItem>
                      <SelectItem value="png-sequence">PNG Sequence</SelectItem>
                      <SelectItem value="png">Single PNG Frame</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h4 className="mb-2 font-semibold">Resolution</h4>
                  <div className="flex items-center space-x-2 mb-2">
                    <Label className="w-16">Width</Label>
                    <Input
                      type="number"
                      value={recordingResolution.width}
                      onChange={(e: { target: { value: string } }) => {
                        const { target } = e;
                        const { value } = target;
                        updateResolution("width", value);
                      }}
                      className="w-24"
                    />
                    <span className="text-sm">px</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label className="w-16">Height</Label>
                    <Input
                      type="number"
                      value={recordingResolution.height}
                      onChange={(e: { target: { value: string } }) => {
                        const { target } = e;
                        const { value } = target;
                        updateResolution("height", value);
                      }}
                      className="w-24"
                    />
                    <span className="text-sm">px</span>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 font-semibold">Frame Rate</h4>
                  <div className="flex items-center space-x-2">
                    <Slider
                      min={1}
                      max={60}
                      step={1}
                      value={[frameRate]}
                      onValueChange={(value: number[]) => handleFrameRateChange(value[0])}
                      className="w-full"
                    />
                    <span className="w-12 text-right text-sm">{frameRate} fps</span>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 font-semibold">Video Quality</h4>
                  <div className="flex items-center space-x-2">
                    <Slider
                      min={1}
                      max={16}
                      step={1}
                      value={[videoBitrate]}
                      onValueChange={(value: number[]) => handleBitrateChange(value[0])}
                      className="w-full"
                      disabled={exportFormat !== "webm" && exportFormat !== "mp4"}
                    />
                    <span className="w-16 text-right text-sm">{videoBitrate} Mbps</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Higher values = better quality but larger files
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 font-semibold">Recording Duration</h4>
                  <div className="flex items-center space-x-2">
                    <Slider
                      min={1}
                      max={30}
                      step={1}
                      value={[recordingDuration]}
                      onValueChange={(value: number[]) => setRecordingDuration(value[0])}
                      className="w-full"
                    />
                    <span className="w-12 text-right text-sm">{recordingDuration}s</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Total frames: {recordingDuration * frameRate}
                  </div>
                </div>

                <div className="flex space-x-2">
                  {!isRecording ? (
                    <Button onClick={startRecording} className="flex-1" disabled={isExporting}>
                      <Record className="w-4 h-4 mr-2" />
                      Record
                    </Button>
                  ) : (
                    <Button onClick={stopRecording} variant="destructive" className="flex-1">
                      <Square className="w-4 h-4 mr-2" />
                      Stop
                    </Button>
                  )}

                  <Button
                    onClick={handleExport}
                    variant="outline"
                    disabled={recordingFrames.length === 0 || isRecording || isExporting}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>

                {(isRecording || exportProgress > 0) && (
                  <div>
                    <h4 className="mb-2 font-semibold">{isRecording ? "Recording Progress" : "Export Progress"}</h4>
                    <Progress value={exportProgress} className="w-full" />
                  </div>
                )}

                {recordingFrames.length > 0 && (
                  <div className="text-xs text-muted-foreground">{recordingFrames.length} frames captured</div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        {isRecording && (
          <div
            className="absolute border-2 border-red-500 pointer-events-none"
            style={{
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
              zIndex: 10,
            }}
          >
            <div className="absolute top-0 left-0 bg-red-500 text-white text-xs px-1">
              Recording {recordingResolution.width}x{recordingResolution.height} @ {frameRate}fps
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
