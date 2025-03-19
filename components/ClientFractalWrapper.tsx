"use client"

import dynamic from 'next/dynamic'
import React from 'react'

// Dynamically import the FractalGenerator component with SSR disabled
const FractalGenerator = dynamic(
  () => import('../fractal-blend-enhanced-animation-new'),
  { ssr: false, loading: () => <div>Loading fractal animation...</div> }
)

export default function ClientFractalWrapper() {
  return <FractalGenerator />
}
