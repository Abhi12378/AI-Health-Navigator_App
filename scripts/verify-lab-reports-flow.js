const BASE_URL = 'http://localhost:3000';

async function main() {
  const samplePdfBase64 = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF', 'utf8').toString('base64');

  const uploadResponse = await fetch(`${BASE_URL}/api/lab-reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: 'sample-lab-report.pdf',
      mimeType: 'application/pdf',
      data: samplePdfBase64,
    }),
  });

  const uploadBody = await uploadResponse.json();
  const reportId = uploadBody?.report?.id;

  const listResponse = await fetch(`${BASE_URL}/api/lab-reports`);
  const listBody = await listResponse.json();

  let getStatus = null;
  if (reportId) {
    const getResponse = await fetch(`${BASE_URL}/api/lab-reports/${reportId}`);
    getStatus = getResponse.status;
  }

  let deleteStatus = null;
  if (reportId) {
    const deleteResponse = await fetch(`${BASE_URL}/api/lab-reports/${reportId}`, { method: 'DELETE' });
    deleteStatus = deleteResponse.status;
  }

  console.log(JSON.stringify({
    uploadStatus: uploadResponse.status,
    uploadSuccess: Boolean(uploadBody?.success),
    listStatus: listResponse.status,
    listCount: Array.isArray(listBody) ? listBody.length : 0,
    retrievedStatus: getStatus,
    deletedStatus: deleteStatus,
  }, null, 2));
}

main().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
