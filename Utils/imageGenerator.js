import sharp from "sharp";
import path from "path";
import fs from "fs";
export async function generateSummaryImage(input) {
  // Normalize input
  let countries = [];
  let outPath = path.join(process.cwd(), "cache", "countries-summary.png");
  if (Array.isArray(input)) {
    countries = input;
  } else if (input && typeof input === "object") {
    countries = Array.isArray(input.countries) ? input.countries : input.top5 || [];
    if (input.outPath) outPath = input.outPath;
  }
  // Ensure cache dir exists
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // Safe defaults
  const totalCountries = typeof input === "object" && input?.totalCountries !== undefined
    ? input.totalCountries
    : countries.length;
  const totalPopulation = countries.reduce((acc, c) => acc + Number(c.population || 0), 0);
  const totalGDP = countries.reduce((acc, c) => acc + Number(c.estimated_gdp || 0), 0);
  const lines = [
    `Total Countries: ${totalCountries}`,
    `Total Population: ${totalPopulation.toLocaleString()}`,
    `Total Estimated GDP: $${totalGDP.toLocaleString()}`
  ];
  // Build SVG with separate tspans for good layout
  const svgImage = `
    <svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="400" fill="#0F172A" />
      <text x="400" y="80" text-anchor="middle" fill="#F8FAFC" font-size="36" font-family="Arial" font-weight="700">World Summary</text>
      <text x="400" y="140" text-anchor="middle" fill="#F8FAFC" font-size="20" font-family="Arial">
        ${lines.map((ln, i) => `<tspan x="400" dy="${i === 0 ? 0 : 28}">${ln}</tspan>`).join("")}
      </text>
    </svg>
  `;
  const buffer = Buffer.from(svgImage);
  await sharp(buffer).png().toFile(outPath);
  return outPath;
}
