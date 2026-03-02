const BASE_URL = 'http://localhost:3000';

async function listCount() {
  const res = await fetch(`${BASE_URL}/api/lab-reports`);
  const data = await res.json();
  return Array.isArray(data) ? data.length : 0;
}

async function main() {
  const before = await listCount();

  const pdfBase64 = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF', 'utf8').toString('base64');
  await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Analyze this report',
      fileData: {
        data: pdfBase64,
        mimeType: 'application/pdf',
        fileName: 'auto-stored-from-chat.pdf',
      },
    }),
  });

  const after = await listCount();
  console.log(JSON.stringify({ before, after, increased: after > before }, null, 2));
}

main().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
