"use client"

import dynamic from 'next/dynamic'

// Dynamically import the FractalGenerator component with SSR disabled
const FractalGenerator = dynamic(
  () => import('../fractal-blend-enhanced-animation'),
  { ssr: false }
)

export default function ClientFractalWrapper() {
  return <FractalGenerator />
}
