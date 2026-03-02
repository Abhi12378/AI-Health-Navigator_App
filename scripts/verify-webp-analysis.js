import sharp from 'sharp';

const BASE_URL = 'http://localhost:3000';

async function main() {
  const svg = `<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white"/>
    <text x="40" y="120" font-size="58" fill="black" font-family="Arial">Lab Report</text>
    <text x="40" y="220" font-size="48" fill="black" font-family="Arial">Hemoglobin: 11.2 g/dL</text>
    <text x="40" y="300" font-size="48" fill="black" font-family="Arial">WBC: 14500 /uL</text>
    <text x="40" y="380" font-size="48" fill="black" font-family="Arial">Platelets: 220000 /uL</text>
  </svg>`;

  const webpBuffer = await sharp(Buffer.from(svg)).webp({ quality: 90 }).toBuffer();
  const base64Data = webpBuffer.toString('base64');

  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Analyze this report deeply and give suggestions',
      fileData: {
        data: base64Data,
        mimeType: 'image/webp',
      },
    }),
  });

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  console.log(JSON.stringify({
    status: res.status,
    provider: body?.provider,
    model: body?.model,
    document_type: body?.document_type,
    has_explanation: Boolean(body?.explanation || body?.response),
    has_safety_advisory: Boolean(body?.safety_advisory),
    error: body?.error,
    details: body?.details,
  }, null, 2));
}

main().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
