// Aggiungere dichiarazioni di tipo per i moduli mancanti all'inizio del file
"use client"

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
// @ts-ignore
import { saveAs } from "file-saver"

// Import componenti personalizzati
import { FractalCurves } from "./components/FractalCurves";
import { RecordingCapture } from "./components/RecordingCapture";
import { FractalControls } from "./components/FractalControls";
import { downloadPngSequence, createVideo, downloadSinglePng } from "./components/ExportUtils";

// Interfacce
interface CustomColors {
  start: string;
  middle: string;
  end: string;
}

interface RecordingResolution {
  width: number;
  height: number;
}

// Componente principale
export function FractalGenerator() {
  // Impostazioni di blend
  const [blendFactors, setBlendFactors] = useState(new THREE.Vector3(0.33, 0.33, 0.34));
  const [blendMethod, setBlendMethod] = useState(0);
  
  // Impostazioni di colore
  const [colorSet, setColorSet] = useState(0);
  const [useCustomColors, setUseCustomColors] = useState(false);
  const [customColors, setCustomColors] = useState<CustomColors>({
    start: "#ff0000",
    middle: "#00ff00",
    end: "#0000ff",
  });
  const [colorAnimationSpeed, setColorAnimationSpeed] = useState(1.0);
  const [colorInterpolationMethod, setColorInterpolationMethod] = useState(0);
  const [backgroundColor, setBackgroundColor] = useState("#000000");
  
  // Impostazioni di animazione
  const [animationSpeed, setAnimationSpeed] = useState(1.0);
  const [elementSize, setElementSize] = useState(0.04);
  const [depth, setDepth] = useState(1.0);
  
  // Stato di registrazione
  const [isRecording, setIsRecording] = useState(false);
  const [recordingFrames, setRecordingFrames] = useState<string[]>([]);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const recordingArea = useMemo(() => ({ width: 1280, height: 720 }), []);
  
  // Stato di esportazione
  const [exportFormat, setExportFormat] = useState("mp4");
  const [exportFramerate, setExportFramerate] = useState(30);
  const [exportInProgress, setExportInProgress] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  
  /**
   * Gestisce il cambio di colore personalizzato
   */
  const handleCustomColorChange = (key: keyof CustomColors, value: string) => {
    setCustomColors({
      ...customColors,
      [key]: value
    });
  };

  /**
   * Aggiorna i fattori di blend mantenendoli normalizzati
   */
  const updateBlendFactor = (index: number, value: number) => {
    const newFactors = blendFactors.clone();
    newFactors.setComponent(index, value);
    const sum = newFactors.x + newFactors.y + newFactors.z;
    newFactors.divideScalar(sum);
    setBlendFactors(newFactors);
  };

  /**
   * Gestisce il cambiamento dello schema di colori
   */
  const handleColorSchemeChange = (scheme: number) => {
    setColorSet(scheme);
  };

  /**
   * Gestisce l'avvio e lo stop della registrazione
   */
  const handleRecordToggle = () => {
    if (isRecording) {
      setIsRecording(false);
      setRecordingProgress(1.0);
    } else {
      setRecordingFrames([]);
      setRecordingProgress(0);
      setIsRecording(true);
    }
  };

  /**
   * Gestisce la cattura di un frame durante la registrazione
   */
  const handleFrameCapture = useCallback((frameData: string) => {
    setRecordingFrames(prev => {
      const newFrames = [...prev, frameData];
      setRecordingProgress(Math.min(newFrames.length / 100, 0.99)); // max al 99% fino alla fine
      return newFrames;
    });
  }, []);

  /**
   * Esporta i frame registrati come video
   */
  const handleExport = async () => {
    if (recordingFrames.length === 0) return;
    
    setExportInProgress(true);
    setExportProgress(0);
    
    try {
      const videoUrl = await createVideo(
        recordingFrames,
        exportFormat as 'mp4' | 'webm',
        exportFramerate,
        (progress) => setExportProgress(progress)
      );
      
      saveAs(videoUrl, `fractal-animation.${exportFormat}`);
    } catch (error) {
      console.error("Error creating video:", error);
    } finally {
      setExportInProgress(false);
      setExportProgress(1.0);
    }
  };

  /**
   * Esporta i frame registrati come sequenza PNG
   */
  const handleExportPngSequence = async () => {
    if (recordingFrames.length === 0) return;
    
    setExportInProgress(true);
    setExportProgress(0);
    
    await downloadPngSequence(recordingFrames, (progress) => {
      setExportProgress(progress);
    });
    
    setExportInProgress(false);
  };

  /**
   * Esporta il frame corrente come PNG
   */
  const handleExportSingleFrame = async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL('image/png');
    downloadSinglePng(dataUrl, `fractal-frame-${Date.now()}.png`);
  };

  return (
    <div className="h-screen w-screen overflow-hidden">
      <FractalControls
        blendFactors={blendFactors}
        updateBlendFactor={updateBlendFactor}
        blendMethod={blendMethod}
        setBlendMethod={setBlendMethod}
        colorSet={colorSet}
        handleColorSchemeChange={handleColorSchemeChange}
        useCustomColors={useCustomColors}
        setUseCustomColors={setUseCustomColors}
        customColors={customColors}
        handleCustomColorChange={handleCustomColorChange}
        animationSpeed={animationSpeed}
        setAnimationSpeed={setAnimationSpeed}
        elementSize={elementSize}
        setElementSize={setElementSize}
        depth={depth}
        setDepth={setDepth}
        colorAnimationSpeed={colorAnimationSpeed}
        setColorAnimationSpeed={setColorAnimationSpeed}
        colorInterpolationMethod={colorInterpolationMethod}
        setColorInterpolationMethod={setColorInterpolationMethod}
        backgroundColor={backgroundColor}
        setBackgroundColor={setBackgroundColor}
        isRecording={isRecording}
        handleRecordToggle={handleRecordToggle}
        recordingProgress={recordingProgress}
        recordingFrames={recordingFrames}
        recordingFrameCount={recordingFrames.length}
        exportFormat={exportFormat}
        setExportFormat={setExportFormat}
        exportFramerate={exportFramerate}
        setExportFramerate={setExportFramerate}
        handleExport={handleExport}
        handleExportPngSequence={handleExportPngSequence}
        handleExportSingleFrame={handleExportSingleFrame}
        exportInProgress={exportInProgress}
        exportProgress={exportProgress}
      />

      <Canvas
        gl={{ preserveDrawingBuffer: true }}
        camera={{ position: [0, 0, 2.5], fov: 50 }}
        style={{ background: backgroundColor }}
      >
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
        
        <OrbitControls enableDamping rotateSpeed={0.5} />
        
        {isRecording && (
          <RecordingCapture
            isRecording={isRecording}
            onFrame={handleFrameCapture}
            recordingArea={recordingArea}
            backgroundColor={backgroundColor}
          />
        )}
      </Canvas>
    </div>
  );
}
