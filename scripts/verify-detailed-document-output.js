import sharp from 'sharp';

const BASE_URL = 'http://localhost:3000';

async function main() {
  const svg = `<svg width="1400" height="900" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white"/>
    <text x="40" y="100" font-size="54" fill="black" font-family="Arial">Health Report</text>
    <text x="40" y="190" font-size="44" fill="black" font-family="Arial">HbA1c: 6.4%</text>
    <text x="40" y="260" font-size="44" fill="black" font-family="Arial">AST: 76 U/L</text>
    <text x="40" y="330" font-size="44" fill="black" font-family="Arial">ALT: 148 U/L</text>
    <text x="40" y="400" font-size="44" fill="black" font-family="Arial">HDL: 38 mg/dL</text>
    <text x="40" y="470" font-size="44" fill="black" font-family="Arial">hs-CRP: 3.73 mg/L</text>
    <text x="40" y="540" font-size="44" fill="black" font-family="Arial">Creatinine: 0.9 mg/dL</text>
  </svg>`;

  const webpBuffer = await sharp(Buffer.from(svg)).webp({ quality: 90 }).toBuffer();

  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Analyze this report in detail and provide recommendations.',
      fileData: {
        data: webpBuffer.toString('base64'),
        mimeType: 'image/webp',
      },
    }),
  });

  const json = await res.json();
  const responseText = String(json?.response || '');
  console.log(JSON.stringify({
    status: res.status,
    provider: json?.provider,
    model: json?.model,
    responseLength: responseText.length,
    responsePreview: responseText.slice(0, 500),
    abnormalValuesCount: Array.isArray(json?.abnormal_values) ? json.abnormal_values.length : 0,
    suggestionsCount: Array.isArray(json?.suggestions) ? json.suggestions.length : 0,
  }, null, 2));
}

main().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
