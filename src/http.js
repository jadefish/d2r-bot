const CACHE_TTL_MS = 60_000;
const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT = "d2r-discord-bot/1.0";

const cache = new Map();

export async function fetchCachedJson(key, url) {
	const text = await fetchCachedText(key, url);
	return JSON.parse(text);
}

export async function fetchCachedText(key, url) {
	const cached = cache.get(key);
	if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
		return cached.value;
	}

	const value = await fetchText(url);
	cache.set(key, { createdAt: Date.now(), value });
	return value;
}

async function fetchText(url) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		const response = await fetch(url, {
			headers: { "user-agent": USER_AGENT },
			signal: controller.signal,
		});

		if (!response.ok) {
			throw new Error(`Fetch failed for ${url}: ${response.status} ${response.statusText}`);
		}

		return await response.text();
	} finally {
		clearTimeout(timeout);
	}
}
