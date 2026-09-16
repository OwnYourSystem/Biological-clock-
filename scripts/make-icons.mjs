// Renders the app icons from inline SVG. Run with `npm run icons` after a
// change to the mark. Output lands in public/ and is committed.
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const mark = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#000000"/>
  <g transform="translate(${pad} ${pad}) scale(${(512 - pad * 2) / 512})">
    <path d="M40 272h84l38-104 62 208 46-128 38 24h124"
      fill="none" stroke="#2e6bff" stroke-width="38"
      stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`

await mkdir('public', { recursive: true })

const targets = [
  { file: 'public/icon-192.png', size: 192, pad: 0 },
  { file: 'public/icon-512.png', size: 512, pad: 0 },
  // Maskable icons are cropped to a circle on Android, so the mark is inset.
  { file: 'public/icon-512-maskable.png', size: 512, pad: 90 },
]

for (const { file, size, pad } of targets) {
  await sharp(Buffer.from(mark(pad))).resize(size, size).png().toFile(file)
  console.log(`wrote ${file}`)
}
