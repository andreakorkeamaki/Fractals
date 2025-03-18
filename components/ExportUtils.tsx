/**
 * Utility per l'esportazione di immagini e video
 */

/**
 * Scarica una sequenza di PNG come file .zip
 */
export async function downloadPngSequence(frames: string[], onProgress: (progress: number) => void) {
  try {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const binary = atob(frame.split(',')[1]);
      const array = [];
      for (let j = 0; j < binary.length; j++) {
        array.push(binary.charCodeAt(j));
      }
      const blob = new Uint8Array(array);
      zip.file(`frame_${i.toString().padStart(5, '0')}.png`, blob);
      
      onProgress((i + 1) / frames.length);
    }
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(zipBlob);
    link.download = `fractal-frames-${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
    
  } catch (error) {
    console.error("Error generating ZIP file:", error);
  }
}

/**
 * Crea un video a partire dai frame
 */
export async function createVideo(
  frames: string[], 
  format: 'mp4' | 'webm', 
  frameRate: number, 
  onProgress: (progress: number) => void, 
  bitrate = 8
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      
      if (!ctx) {
        throw new Error("Could not get canvas context")
      }

      const img = new Image()

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

/**
 * Scarica un singolo frame come PNG
 */
export function downloadSinglePng(dataUrl: string, filename: string) {
  const link = document.createElement("a")
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
