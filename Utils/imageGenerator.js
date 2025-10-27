import sharp from "sharp";
import path from "path";

/**
 * Generates a simple summary image (e.g., country GDP summary)
 */
export async function generateSummaryImage(countries) {
  const totalCountries = countries.length;
  const totalPopulation = countries.reduce((acc, c) => acc + Number(c.population || 0), 0);
  const totalGDP = countries.reduce((acc, c) => acc + Number(c.estimated_gdp || 0), 0);

  const summaryText = `
    Total Countries: ${totalCountries}
    Total Population: ${totalPopulation.toLocaleString()}
    Total Estimated GDP: $${totalGDP.toLocaleString()}
  `;

  const imagePath = path.join(process.cwd(), "cache", "countries-summary.png");

  // Create simple image with text
  const svgImage = `
    <svg width="800" height="400">
      <rect width="800" height="400" fill="#1e293b" />
      <text x="50%" y="40%" text-anchor="middle" fill="#f8fafc" font-size="32" font-family="Arial">World Summary</text>
      <text x="50%" y="60%" text-anchor="middle" fill="#f8fafc" font-size="24" font-family="Arial">${summaryText}</text>
    </svg>
  `;

  const buffer = Buffer.from(svgImage);
  await sharp(buffer).png().toFile(imagePath);
  return imagePath;
}
