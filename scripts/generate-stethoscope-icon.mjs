import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const rootDir = process.cwd();
const iconsDir = path.join(rootDir, 'assets', 'icons');

const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect x="64" y="64" width="896" height="896" rx="220" fill="#0F172A"/>
  <g stroke="#FFFFFF" stroke-width="54" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="320" cy="270" r="72"/>
    <circle cx="704" cy="270" r="72"/>
    <path d="M320 342 L420 490"/>
    <path d="M704 342 L604 490"/>
    <path d="M420 490 C470 600 554 600 604 490"/>
    <path d="M512 600 L512 750"/>
    <circle cx="512" cy="838" r="96"/>
    <path d="M512 742 C650 742 742 650 742 520"/>
    <circle cx="742" cy="450" r="44"/>
  </g>
</svg>
`.trim();

async function generate() {
  await fs.mkdir(iconsDir, { recursive: true });

  const svgPath = path.join(iconsDir, 'stethoscope.svg');
  const pngPath = path.join(iconsDir, 'stethoscope.png');
  const icoPath = path.join(iconsDir, 'stethoscope.ico');

  await fs.writeFile(svgPath, svgIcon, 'utf8');

  await sharp(Buffer.from(svgIcon))
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile(pngPath);

  const icoBuffer = await pngToIco(pngPath);
  await fs.writeFile(icoPath, icoBuffer);

  console.log('Generated icon files:');
  console.log(`- ${svgPath}`);
  console.log(`- ${pngPath}`);
  console.log(`- ${icoPath}`);
}

generate().catch((error) => {
  console.error('Failed to generate stethoscope icon:', error);
  process.exit(1);
});
