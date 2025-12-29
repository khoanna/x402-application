/**
 * Simple test script to fetch data from the Service API.
 *
 * - Fetches city list (ungated)
 * - Attempts weather endpoints (likely 402 Payment Required)
 *
 * Run:
 *   npx ts-node --esm src/tests/fetchService.ts
 *
 * Ensure the service is running (default http://localhost:4000):
 *   npx ts-node --esm src/server.ts
 * And facilitator (default http://localhost:9000) if testing payments:
 *   npx ts-node --esm src/facilitator.ts
 */

type City = {
  id: string;
  city: string;
  country: string;
  lat: number;
  long: number;
  timezone: string;
};

type CityListResponse = {
  success: boolean;
  count: number;
  data: City[];
};

const BASE_URL = process.env.SERVICE_URL || "http://localhost:4000";

async function fetchJson(url: string) {
  const res = await fetch(url);
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const body = isJson ? await res.json() : await res.text();
  return { status: res.status, ok: res.ok, body };
}

async function testCityList() {
  console.log(`\n[TEST] GET /city/list`);
  const { status, ok, body } = await fetchJson(`${BASE_URL}/city/list`);
  console.log("Status:", status);
  console.log("OK:", ok);
  console.log("Body:", body);

  if (ok && body && body.success && Array.isArray(body.data)) {
    const ids = body.data.map((c: City) => c.id);
    console.log("City IDs:", ids.join(", "));
    return body.data[0]?.id as string | undefined;
  }
  return undefined;
}

async function testWeatherCurrent(id: string) {
  console.log(`\n[TEST] GET /weather/current/:id -> ${id}`);
  const { status, ok, body } = await fetchJson(`${BASE_URL}/weather/current/${id}`);
  console.log("Status:", status);
  console.log("OK:", ok);
  console.log("Body:", body);

  if (status === 402) {
    console.log("Payment Required: The response likely includes payment requirements.");
  }
}

async function testWeatherForecast(id: string) {
  console.log(`\n[TEST] GET /weather/forecast/:id -> ${id}`);
  const { status, ok, body } = await fetchJson(`${BASE_URL}/weather/forecast/${id}`);
  console.log("Status:", status);
  console.log("OK:", ok);
  console.log("Body:", body);

  if (status === 402) {
    console.log("Payment Required: The response likely includes payment requirements.");
  }
}

async function main() {
  console.log("Service base URL:", BASE_URL);

  // 1) Ungated endpoint
  const firstCityId = await testCityList();

  // 2) Gated endpoints – will likely return 402 without payment
  if (firstCityId) {
    await testWeatherCurrent(firstCityId);
    await testWeatherForecast(firstCityId);
  } else {
    console.warn("No city ID found from /city/list; skipping weather tests.");
  }
}

main().catch((err) => {
  console.error("Test script error:", err);
  process.exitCode = 1;
});
