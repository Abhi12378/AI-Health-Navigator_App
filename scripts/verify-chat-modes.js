const BASE_URL = "http://localhost:3000";

async function postJson(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

(async () => {
  const normalChat = await postJson("/api/chat", {
    message: "hi",
    includeWebSearch: false,
  });

  const unsupportedUpload = await postJson("/api/chat", {
    message: "analyze it",
    fileData: {
      data: "dGVzdA==",
      mimeType: "image/webp",
    },
  });

  console.log(JSON.stringify({ normalChat, unsupportedUpload }, null, 2));
})();
