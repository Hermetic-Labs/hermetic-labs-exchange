import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import sourceIdentifierPlugin from 'vite-plugin-source-identifier'

const isProd = process.env.BUILD_MODE === 'prod'
// In production (GitHub Pages), use /hermetic-labs-exchange/ base path
// In dev mode, use root so catalog.json is at localhost:5174/catalog.json
export default defineConfig({
  base: isProd ? '/hermetic-labs-exchange/' : '/',
  plugins: [
    react(),
    sourceIdentifierPlugin({
      enabled: !isProd,
      attributePrefix: 'data-matrix',
      includeProps: true,
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Deduplicate Three.js and related packages to prevent "Multiple instances" warning
    dedupe: [
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      '@react-three/xr',
      'react',
      'react-dom',
    ],
  },
  server: {
    port: 5174,
    strictPort: true,
  },
  preview: {
    port: 5174,
  },
})
