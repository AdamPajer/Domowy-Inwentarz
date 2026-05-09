import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // Zmieniono z @vitejs/react-refresh
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Domowy Inwentarz',
        short_name: 'Inwentarz',
        description: 'Aplikacja do zarządzania zapasami',
        theme_color: '#2E7D32', // Spójny kolor z Design Systemem [cite: 41, 76]
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})