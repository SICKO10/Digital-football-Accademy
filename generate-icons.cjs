// generate-icons.js — lance avec: node generate-icons.js
// Nécessite: npm install sharp --save-dev

const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const dir = path.join(__dirname, 'public', 'icons')
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

// SVG source de l'icône
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="80" fill="#0a0a0a"/>
  <rect x="20" y="20" width="472" height="472" rx="64" fill="#111"/>
  <text x="256" y="280" text-anchor="middle" 
    font-family="Arial Black, Impact, sans-serif" 
    font-size="200" font-weight="900" fill="white">DF</text>
  <circle cx="256" cy="380" r="50" fill="#4ade80" opacity="0.2"/>
  <text x="256" y="398" text-anchor="middle" font-size="60">⚽</text>
</svg>
`

const svgBuffer = Buffer.from(svg)

async function generateIcons() {
  const sizes = [
    { size: 192, name: 'icon-192.png' },
    { size: 512, name: 'icon-512.png' },
    { size: 180, name: 'apple-touch-icon.png' },
    { size: 32,  name: 'favicon-32.png' },
  ]

  for (const { size, name } of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(dir, name))
    console.log(`✅ Généré: public/icons/${name} (${size}x${size})`)
  }

  console.log('\n🚀 Toutes les icônes générées !')
}

generateIcons().catch(console.error)