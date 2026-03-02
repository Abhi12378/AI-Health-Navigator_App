const BASE_URL = "http://localhost:3000";

async function run() {
  const results = [];

  async function check(name, fn) {
    try {
      const data = await fn();
      results.push({ name, ok: true, data });
    } catch (error) {
      results.push({ name, ok: false, error: String(error) });
    }
  }

  await check("GET /api/user", async () => {
    const res = await fetch(`${BASE_URL}/api/user`);
    return { status: res.status };
  });

  await check("POST /api/chat", async () => {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Reply only with OK", includeWebSearch: false }),
    });
    const bodyText = await res.text();
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch {
      body = { raw: bodyText };
    }
    return {
      status: res.status,
      provider: body?.provider,
      model: body?.model,
      hasResponse: typeof body?.response === "string" || typeof body?.explanation === "string",
      error: body?.error,
      details: body?.details,
    };
  });

  await check("GET /api/hospitals/nearby", async () => {
    const res = await fetch(`${BASE_URL}/api/hospitals/nearby?lat=12.9716&lng=77.5946&radiusKm=10`);
    const bodyText = await res.text();
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch {
      body = { raw: bodyText };
    }

    return {
      status: res.status,
      hospitalsCount: Array.isArray(body?.hospitals) ? body.hospitals.length : 0,
      error: body?.error,
      details: body?.details,
    };
  });

  await check("GET /auth/google", async () => {
    const res = await fetch(`${BASE_URL}/auth/google`, { redirect: "manual" });
    return {
      status: res.status,
      location: res.headers.get("location") || null,
    };
  });

  const summary = {
    checkedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    results,
  };

  console.log(JSON.stringify(summary, null, 2));
}

run().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
