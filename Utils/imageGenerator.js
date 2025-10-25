import sharp from "sharp";
import fs from "fs";
import path from "path";

/**
 * Simple SVG to PNG conversion. Produces a readable summary image.
 * top5: array of { name, estimated_gdp } - estimated_gdp may be number
 */
export async function generateSummaryImage({ totalCountries = 0, top5 = [], timestamp = new Date().toISOString(), outPath = "./cache/summary.png" }) {
  const width = 1200;
  const height = 800;

  const topRowsText = top5.map((r, idx) => {
    const gdp = (r.estimated_gdp == null) ? "N/A" : Number(r.estimated_gdp).toLocaleString(undefined, { maximumFractionDigits: 2 });
    return `${idx + 1}. ${r.name} — ${gdp}`;
  }).join("");

  // build svg with lines spaced
  let rows = "";
  for (let i = 0; i < top5.length; i++) {
    const r = top5[i];
    const gdp = (r.estimated_gdp == null) ? "N/A" : Number(r.estimated_gdp).toLocaleString(undefined, { maximumFractionDigits: 2 });
    rows += `<text x="40" y="${160 + i * 36}" font-size="22" fill="#ffffff">${i + 1}. ${escapeXml(r.name)} — ${gdp}</text>`;
  }

  const svg = `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#0f1724"/>
    <text x="40" y="60" font-size="36" fill="#ffffff">Countries Summary</text>
    <text x="40" y="104" font-size="20" fill="#94a3b8">Total countries: ${totalCountries}</text>
    <g>${rows}</g>
    <text x="40" y="${height - 40}" font-size="14" fill="#94a3b8">Last refreshed: ${timestamp}</text>
  </svg>
  `;

  // ensure directory
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const buffer = Buffer.from(svg);
  await sharp(buffer).png().toFile(outPath);
}

// helper to escape XML
function escapeXml(unsafe) {
  if (!unsafe) return "";
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
