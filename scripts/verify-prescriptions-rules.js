const BASE_URL = 'http://localhost:3000';

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function main() {
  const payloadData = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF', 'utf8').toString('base64');

  const labUploadToPrescription = await post('/api/prescriptions', {
    fileName: 'full-lab-report.pdf',
    mimeType: 'application/pdf',
    data: payloadData,
  });

  const validPrescriptionUpload = await post('/api/prescriptions', {
    fileName: 'doctor-prescription-rx.pdf',
    mimeType: 'application/pdf',
    data: payloadData,
  });

  console.log(JSON.stringify({
    labUploadToPrescriptionStatus: labUploadToPrescription.status,
    labUploadToPrescriptionMessage: labUploadToPrescription.json?.error,
    validPrescriptionUploadStatus: validPrescriptionUpload.status,
    validPrescriptionUploadSuccess: Boolean(validPrescriptionUpload.json?.success),
  }, null, 2));
}

main().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
