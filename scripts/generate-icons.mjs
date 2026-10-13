// Renders the monochrome app icon (white glyph on a transparent background,
// as the Meta docs recommend for glasses icons) into public/icon-*.png.
// Usage: npm run icons
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

// A pull request: two branch nodes on the left joined by a line, and an arrow
// from the right node back into the line (no GitHub logo: it's not ours to use).
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <g fill="none" stroke="#ffffff" stroke-width="40" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="140" cy="104" r="52"/>
    <circle cx="140" cy="408" r="52"/>
    <circle cx="372" cy="408" r="52"/>
    <path d="M140 156v200"/>
    <path d="M372 356V196a64 64 0 0 0-64-64h-72"/>
    <path d="M286 82l-58 50 58 50"/>
  </g>
</svg>`;

for (const size of [192, 512]) {
  const out = path.join(root, 'public', `icon-${size}.png`);
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
  console.log(`icon: ${path.relative(root, out)}`);
}
