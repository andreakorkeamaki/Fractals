"use client"

import { useRef, useState, useMemo, useCallback } from "react"
import { Canvas, useFrame, extend, useThree } from "@react-three/fiber"
import { OrbitControls, shaderMaterial } from "@react-three/drei"
import * as THREE from "three"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Palette, Download, RepeatIcon as Record, Square } from "lucide-react"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"

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
  // Vertex Shader (unchanged)
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
  // Fragment Shader (unchanged)
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

const FractalCurves = ({
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
  const mesh = useRef()
  const instanceCount = 5000

  const indices = useMemo(() => {
    const temp = new Float32Array(instanceCount)
    for (let i = 0; i < instanceCount; i++) {
      temp[i] = i
    }
    return temp
  }, [])

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.material.uniforms.time.value = state.clock.elapsedTime
      mesh.current.material.uniforms.blendFactors.value = blendFactors
      mesh.current.material.uniforms.blendMethod.value = blendMethod
      mesh.current.material.uniforms.colorSet.value = colorSet
      mesh.current.material.uniforms.useCustomColors.value = useCustomColors
      mesh.current.material.uniforms.customColorStart.value = new THREE.Color(customColors.start)
      mesh.current.material.uniforms.customColorMiddle.value = new THREE.Color(customColors.middle)
      mesh.current.material.uniforms.customColorEnd.value = new THREE.Color(customColors.end)
      mesh.current.material.uniforms.animationSpeed.value = animationSpeed
      mesh.current.material.uniforms.elementSize.value = elementSize
      mesh.current.material.uniforms.depth.value = depth
      mesh.current.material.uniforms.colorAnimationSpeed.value = colorAnimationSpeed
      mesh.current.material.uniforms.colorInterpolationMethod.value = colorInterpolationMethod
    }
  })

  return (
    <instancedMesh ref={mesh} args={[null, null, instanceCount]}>
      <planeGeometry args={[1, 0.1, 1, 1]} />
      <fractalMaterial />
      <instancedBufferAttribute attach="geometry-attributes-index" args={[indices, 1]} />
    </instancedMesh>
  )
}

const RecordingCapture = ({ isRecording, onFrame, recordingArea, backgroundColor }) => {
  const { scene, camera } = useThree()
  const frameRef = useRef(0)

  useFrame(() => {
    if (isRecording) {
      // Only capture every other frame to reduce load
      frameRef.current += 1
      if (frameRef.current % 2 !== 0) return

      // Create a separate renderer that doesn't affect the main canvas
      const offscreenCanvas = document.createElement("canvas")
      offscreenCanvas.width = recordingArea.width
      offscreenCanvas.height = recordingArea.height

      const renderer = new THREE.WebGLRenderer({
        canvas: offscreenCanvas,
        antialias: true,
        alpha: false, // Disable alpha to ensure background is included
        preserveDrawingBuffer: true,
      })

      // Convert hex color to THREE.Color
      const bgColor = new THREE.Color(backgroundColor)
      renderer.setClearColor(bgColor, 1.0) // Set opacity to 1.0 (fully opaque)
      renderer.setSize(recordingArea.width, recordingArea.height)
      renderer.render(scene, camera)

      // Get the frame data
      const dataUrl = offscreenCanvas.toDataURL("image/png")
      onFrame(dataUrl)

      // Clean up to prevent memory leaks
      renderer.dispose()
    }
  })

  return null
}

// Function to download a single PNG
function downloadSinglePng(dataUrl, filename) {
  const link = document.createElement("a")
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Function to download multiple PNGs as a sequence
function downloadPngSequence(frames, onProgress) {
  return new Promise((resolve) => {
    // Create a counter for downloaded files
    let downloadedCount = 0
    const totalFrames = frames.length

    // Create a zip-like structure (in this case, we'll just download each file)
    frames.forEach((frame, index) => {
      const paddedIndex = String(index).padStart(5, "0")
      const filename = `fractal-frame-${paddedIndex}.png`

      // Create a link for each frame
      const link = document.createElement("a")
      link.href = frame
      link.download = filename

      // Delay each download slightly to prevent browser issues
      setTimeout(() => {
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Update progress
        downloadedCount++
        onProgress(Math.floor((downloadedCount / totalFrames) * 100))

        // Resolve when all downloads are complete
        if (downloadedCount === totalFrames) {
          resolve(true)
        }
      }, index * 100) // Stagger downloads
    })
  })
}

// Function to create a video from frames with improved encoding
async function createVideo(frames, format, frameRate, onProgress, bitrate = 8) {
  return new Promise(async (resolve, reject) => {
    try {
      // Create a canvas to draw frames on
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      // Load the first frame to get dimensions
      const firstFrameImg = new Image()
      firstFrameImg.crossOrigin = "anonymous"

      firstFrameImg.onload = async () => {
        // Set canvas size to match frame dimensions
        canvas.width = firstFrameImg.width
        canvas.height = firstFrameImg.height

        // Determine the best codec options available
        const mimeTypes = {
          webm: [
            "video/webm;codecs=vp9,opus", // VP9 (better quality)
            "video/webm;codecs=vp8,opus", // VP8 (more compatible)
            "video/webm", // Default
          ],
          mp4: [
            "video/mp4;codecs=h264,aac", // H.264 (standard)
            "video/mp4", // Default
          ],
        }

        // Find the first supported mime type
        const supportedMimeType =
          mimeTypes[format].find((type) => {
            try {
              return MediaRecorder.isTypeSupported(type)
            } catch (e) {
              return false
            }
          }) || "video/webm" // Fallback to WebM

        console.log(`Using codec: ${supportedMimeType}`)

        // Create a MediaRecorder with high quality settings
        const stream = canvas.captureStream(frameRate)
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: supportedMimeType,
          videoBitsPerSecond: bitrate * 1000000, // Convert Mbps to bps
        })

        const chunks = []

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data)
          }
        }

        mediaRecorder.onstop = () => {
          // Create a blob from all chunks
          const blob = new Blob(chunks, { type: supportedMimeType })
          onProgress(100)

          // Add codec info to the result
          resolve({
            blob,
            codec: supportedMimeType,
            extension: supportedMimeType.includes("mp4") ? "mp4" : "webm",
          })
        }

        // Start recording
        mediaRecorder.start()

        // Draw each frame on the canvas with a delay
        for (let i = 0; i < frames.length; i++) {
          // Update progress
          onProgress(Math.floor((i / frames.length) * 90))

          // Load and draw the current frame
          await new Promise((resolve) => {
            const img = new Image()
            img.crossOrigin = "anonymous"
            img.onload = () => {
              ctx.clearRect(0, 0, canvas.width, canvas.height)
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
              resolve()
            }
            img.src = frames[i]
          })

          // Wait for the appropriate frame duration
          await new Promise((resolve) => setTimeout(resolve, 1000 / frameRate))
        }

        // Stop recording after all frames are processed
        mediaRecorder.stop()
      }

      // Load the first frame
      firstFrameImg.src = frames[0]
    } catch (error) {
      console.error("Error creating video:", error)
      reject(error)
    }
  })
}

export default function FractalGenerator() {
  const [blendFactors, setBlendFactors] = useState(new THREE.Vector3(0.33, 0.33, 0.34))
  const [blendMethod, setBlendMethod] = useState(0)
  const [colorSet, setColorSet] = useState(0)
  const [useCustomColors, setUseCustomColors] = useState(false)
  const [customColors, setCustomColors] = useState({
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
  const [recordingFrames, setRecordingFrames] = useState([])
  const [recordingDuration, setRecordingDuration] = useState(5)
  const [showRecordingControls, setShowRecordingControls] = useState(false)
  const [recordingResolution, setRecordingResolution] = useState({ width: 1920, height: 1080 })
  const [isExporting, setIsExporting] = useState(false)
  const [frameRate, setFrameRate] = useState(24)
  const [videoBitrate, setVideoBitrate] = useState(8)

  const updateBlendFactor = (index, value) => {
    const newFactors = blendFactors.clone()
    newFactors.setComponent(index, value)
    const sum = newFactors.x + newFactors.y + newFactors.z
    newFactors.divideScalar(sum)
    setBlendFactors(newFactors)
  }

  const updateCustomColor = (key, value) => {
    setCustomColors((prev) => ({ ...prev, [key]: value }))
  }

  const updateResolution = (dimension, value) => {
    const numValue = Number.parseInt(value, 10)
    if (!isNaN(numValue) && numValue > 0) {
      setRecordingResolution((prev) => ({
        ...prev,
        [dimension]: numValue,
      }))
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
    (frameData) => {
      setRecordingFrames((prev) => [...prev, frameData])

      // Calculate progress based on expected frames
      const expectedFrames = recordingDuration * frameRate
      const progress = Math.min(100, (recordingFrames.length / expectedFrames) * 100)
      setExportProgress(progress)

      // Auto-stop after reaching the duration
      if (recordingFrames.length >= expectedFrames) {
        stopRecording()
      }
    },
    [recordingFrames.length, recordingDuration, frameRate, stopRecording],
  )

  const exportRecording = useCallback(async () => {
    if (recordingFrames.length === 0) return

    setIsExporting(true)
    setExportProgress(0)

    try {
      let result, filename

      if (exportFormat === "png-sequence") {
        // Export all frames as individual PNGs
        await downloadPngSequence(recordingFrames, setExportProgress)
        setIsExporting(false)
        return
      } else if (exportFormat === "png") {
        // Export just the first frame as a high-quality PNG
        downloadSinglePng(recordingFrames[0], `fractal-frame-${Date.now()}.png`)
        setExportProgress(100)
        setIsExporting(false)
        return
      } else if (exportFormat === "webm" || exportFormat === "mp4") {
        // Create video file with improved encoding
        result = await createVideo(recordingFrames, exportFormat, frameRate, setExportProgress, videoBitrate)
        filename = `fractal-animation-${Date.now()}.${result.extension}`

        // Show codec information
        console.log(`Video created with codec: ${result.codec}`)
      }

      // Download the file
      if (result && result.blob) {
        const url = URL.createObjectURL(result.blob)
        const link = document.createElement("a")
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("Error exporting recording:", error)
    } finally {
      setIsExporting(false)
    }
  }, [recordingFrames, exportFormat, frameRate, videoBitrate])

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
                            onValueChange={(value) => updateBlendFactor(index, value[0])}
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
                        onValueChange={(value) => setAnimationSpeed(value[0])}
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
                        onValueChange={(value) => setElementSize(value[0])}
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
                        onValueChange={(value) => setDepth(value[0])}
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
                            <input
                              type="color"
                              value={customColors[key]}
                              onChange={(e) => updateCustomColor(key, e.target.value)}
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
                        onValueChange={(value) => setColorAnimationSpeed(value[0])}
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
                            onClick={() => setColorInterpolationMethod(index)}
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
                        <input
                          type="color"
                          value={backgroundColor}
                          onChange={(e) => setBackgroundColor(e.target.value)}
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
                  <Select value={exportFormat} onValueChange={setExportFormat}>
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
                      onChange={(e) => updateResolution("width", e.target.value)}
                      className="w-24"
                    />
                    <span className="text-sm">px</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label className="w-16">Height</Label>
                    <Input
                      type="number"
                      value={recordingResolution.height}
                      onChange={(e) => updateResolution("height", e.target.value)}
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
                      onValueChange={(value) => setFrameRate(value[0])}
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
                      onValueChange={(value) => setVideoBitrate(value[0])}
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
                      onValueChange={(value) => setRecordingDuration(value[0])}
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
                    onClick={exportRecording}
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

