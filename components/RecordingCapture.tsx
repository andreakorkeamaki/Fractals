import React, { useEffect, useRef } from 'react';
import { useThree } from "@react-three/fiber";
import * as THREE from 'three';

interface RecordingResolution {
  width: number;
  height: number;
}

interface RecordingCaptureProps {
  isRecording: boolean;
  onFrame: (frameData: string) => void;
  recordingArea: RecordingResolution;
  backgroundColor: string;
}

export function RecordingCapture({ 
  isRecording, 
  onFrame, 
  recordingArea, 
  backgroundColor 
}: RecordingCaptureProps) {
  const { gl, scene, camera } = useThree();
  const requestRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (!isRecording) {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      return;
    }
    
    // Backup original size
    const originalSize = {
      width: gl.domElement.width,
      height: gl.domElement.height
    };
    
    // Create a new renderer for high-res capture
    const captureRenderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: true
    });
    captureRenderer.setSize(recordingArea.width, recordingArea.height);
    captureRenderer.setClearColor(backgroundColor, 1);
    
    // Animation loop for capture
    const captureFrame = () => {
      if (isRecording) {
        captureRenderer.render(scene, camera);
        const frameData = captureRenderer.domElement.toDataURL('image/png');
        onFrame(frameData);
        requestRef.current = requestAnimationFrame(captureFrame);
      }
    };
    
    // Start capture loop
    captureFrame();
    
    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      captureRenderer.dispose();
    };
  }, [isRecording, onFrame, recordingArea, backgroundColor, gl, scene, camera]);
  
  return null;
}

export default RecordingCapture;
