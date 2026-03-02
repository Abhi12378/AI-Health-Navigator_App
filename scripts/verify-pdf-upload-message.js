const BASE_URL = 'http://localhost:3000';

async function run() {
  const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF', 'utf8').toString('base64');

  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'analyze it',
      fileData: {
        data: dummyPdf,
        mimeType: 'application/pdf',
      },
    }),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  console.log(JSON.stringify({ status: res.status, data }, null, 2));
}

run().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
