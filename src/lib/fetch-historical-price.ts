// Pulls the kVCM spot history via Alchemy's Prices API. Called from a
// Framework data loader at build time; returns null when ALCHEMY_API_KEY is
// absent so the conclusions page's historical preset degrades to a no-op.

const ADDRESS = "0x00fbac94fec8d4089d3fe979f39454f48c71a65d";
const NETWORK = "base-mainnet";
const INTERVAL = "1d";
// Alchemy caps the 1d interval at 365 points per request.
const WINDOW_DAYS = 365;

interface AlchemyPoint {
  value: string;
  timestamp: string;
}

interface AlchemyResponse {
  network?: string;
  address?: string;
  currency?: string;
  data?: AlchemyPoint[];
  error?: { message?: string };
}

export interface OutputPoint {
  timestamp: string;
  value: number;
}

export interface HistoricalPriceArtifact {
  address: string;
  network: string;
  currency: string;
  interval: string;
  fetchedAt: string;
  data: OutputPoint[];
}

export async function fetchHistoricalPrice(): Promise<HistoricalPriceArtifact | null> {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) return null;

  const fetchedAt = new Date().toISOString();
  const now = new Date();
  const start = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const body = {
    network: NETWORK,
    address: ADDRESS,
    startTime: start.toISOString(),
    endTime: now.toISOString(),
    interval: INTERVAL,
  };

  const url = `https://api.g.alchemy.com/prices/v1/${apiKey}/tokens/historical`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: AlchemyResponse;
  try {
    json = JSON.parse(text) as AlchemyResponse;
  } catch {
    throw new Error(`Alchemy ${res.status}: non-JSON response: ${text.slice(0, 200)}`);
  }
  if (!res.ok || json.error) {
    throw new Error(
      `Alchemy ${res.status}: ${json.error?.message ?? text.slice(0, 200)}`,
    );
  }

  const data: OutputPoint[] = (json.data ?? []).map((p) => ({
    timestamp: p.timestamp,
    value: Number(p.value),
  }));

  return {
    address: ADDRESS,
    network: NETWORK,
    currency: json.currency ?? "usd",
    interval: INTERVAL,
    fetchedAt,
    data,
  };
}
