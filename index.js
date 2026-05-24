import process from "node:process";
import { Client, Events, GatewayIntentBits, SlashCommandBuilder, SlashCommandSubcommandBuilder } from "discord.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const DCLONE_URL = "https://diablo2.io/dclone_api.php";
const TERROR_ZONE_URL = "https://d2emu.com/tz";
const CACHE_TTL_MS = 60_000;
const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT = "d2r-discord-bot/1.0";

const progressMessages = {
	"1": "Terror gazes upon Sanctuary",
	"2": "Terror approaches Sanctuary",
	"3": "Terror begins to form within Sanctuary",
	"4": "Terror spreads across Sanctuary",
	"5": "Terror is about to be unleashed upon Sanctuary",
	"6": "Diablo has invaded Sanctuary",
};

const immunityEmojis = {
	Cold: "🧊",
	Fire: "🔥",
	Lightning: "⚡",
	Magic: "✨",
	Physical: "🗡️",
	Poison: "☠️",
};

const cache = new Map();

client.once(Events.ClientReady, async (readyClient) => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);

	if (process.env["D2RBOT_GUILD_ID"]) {
		const guild = await readyClient.guilds.fetch(process.env["D2RBOT_GUILD_ID"]);
		await guild.commands.create(command.toJSON());
		console.log(`Registered /d2r in guild ${guild.name}`);
		return;
	}

	await readyClient.application.commands.create(command.toJSON());
	console.log("Registered global /d2r command");
});

const dcloneCommand = new SlashCommandSubcommandBuilder()
	.setName("dclone")
	.setDescription("Shows the current Diablo Clone status for Americas RotW Softcore.");

const terrorZoneCommand = new SlashCommandSubcommandBuilder()
	.setName("tz")
	.setDescription("Shows the current and next terror zone.");

const command = new SlashCommandBuilder()
	.setName("d2r")
	.setDescription("Diablo II: Resurrected tools.")
	.addSubcommand(dcloneCommand)
	.addSubcommand(terrorZoneCommand);

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand() || interaction.commandName !== "d2r") {
		return;
	}

	await interaction.deferReply();

	try {
		const subcommand = interaction.options.getSubcommand();

		if (subcommand === "dclone") {
			await interaction.editReply(await getDcloneReply());
			return;
		}

		if (subcommand === "tz") {
			await interaction.editReply(await getTerrorZoneReply());
			return;
		}

		await interaction.editReply("Unknown `/d2r` subcommand.");
	} catch (error) {
		console.error("Failed to handle interaction:", error);
		await interaction.editReply(`Error: ${error}. Try again in a minute.`);
	}
});

async function getDcloneReply() {
	const statuses = await getDcloneStatuses();
	const ladder = statuses.find((status) => String(status.ladder) === "1");
	const nonLadder = statuses.find((status) => String(status.ladder) === "2");

	if (!ladder || !nonLadder) {
		throw new Error("Missing ladder or non-ladder dclone data");
	}

	return [
		"**Diablo Clone - RotW Softcore Americas**",
		formatDcloneStatus("Ladder", ladder),
		formatDcloneStatus("Non-Ladder", nonLadder),
	].join("\n");
}

async function getDcloneStatuses() {
	const url = new URL(DCLONE_URL);
	url.searchParams.set("region", "1");
	url.searchParams.set("hc", "2");
	url.searchParams.set("ver", "2");

	const data = await fetchCachedJson("dclone", url);
	if (!Array.isArray(data) || data.length === 0) {
		throw new Error("No dclone data returned");
	}

	return data;
}

function formatDcloneStatus(label, status) {
	const progress = String(status.progress ?? "?");
	const message = progressMessages[progress] ?? "Unknown status";
	const timestamp = Number(status.timestamped);
	const updated = Number.isFinite(timestamp) && timestamp > 0 ? ` (<t:${timestamp}:R>)` : "";

	return `**${label}:** ${progress}/6 - ${message}${updated}`;
}

async function getTerrorZoneReply() {
	const html = await fetchCachedText("terror-zone", TERROR_ZONE_URL);
	const zones = parseTerrorZones(html);

	return [
		"**Terror Zones - Online**",
		formatTerrorZoneStatus("Current", zones.current),
		formatTerrorZoneStatus("Next", zones.next),
	].join("\n");
}

function parseTerrorZones(html) {
	const current = parseTerrorZoneValue(html, "__1");
	const next = parseTerrorZoneValue(html, "__2");

	if (!current || !next) {
		throw new Error("Could not parse terror zones from d2emu page");
	}

	return { current, next };
}

function parseTerrorZoneValue(html, id) {
	const match = html.match(new RegExp(`id="${id}"[^>]*value="([^"]+)"`));
	if (!match) {
		return null;
	}

	const decoded = decodeD2EmuValue(match[1]);
	const localizedNames = JSON.parse(decoded);
	const englishName = localizedNames.enUS;

	if (typeof englishName !== "string") {
		return null;
	}

	return {
		name: normalizeZoneName(englishName),
		immunities: parseTerrorZoneImmunities(html, match.index),
	};
}

function parseTerrorZoneImmunities(html, zoneIndex) {
	const pageBeforeZone = html.slice(0, zoneIndex);
	const matches = [...pageBeforeZone.matchAll(/Terror Zone has monsters with immunities:\s*<\/br>\s*([^<]+)/g)];
	const lastMatch = matches.at(-1);

	if (!lastMatch) {
		return [];
	}

	return lastMatch[1]
		.split(",")
		.map((immunity) => immunity.trim())
		.filter(Boolean);
}

function formatTerrorZoneStatus(label, zone) {
	const immunities = zone.immunities.length > 0 ? formatImmunities(zone.immunities) : "none";
	return `**${label}:** ${zone.name} (${immunities})`;
}

function formatImmunities(immunities) {
	return immunities
		.map((immunity) => `${immunityEmojis[immunity] ?? "?"}`)
		.join(" ");
}

function decodeD2EmuValue(value) {
	const bytes = Buffer.from(value, "base64");
	const firstKey = "kab2jnb1";
	const secondKey = "kbd2jnb1";
	const decoded = Buffer.alloc(bytes.length);

	for (let index = 0; index < bytes.length; index += 1) {
		decoded[index] = bytes[index]
			^ firstKey.charCodeAt(index % firstKey.length)
			^ secondKey.charCodeAt(index % secondKey.length);
	}

	return decoded.toString("utf8");
}

function normalizeZoneName(name) {
	return name
		.replaceAll("</br>", " / ")
		.replaceAll("<br>", " / ")
		.replaceAll("<br/>", " / ")
		.replaceAll("<br />", " / ")
		.replace(/\s+/g, " ")
		.trim();
}

async function fetchCachedJson(key, url) {
	const text = await fetchCachedText(key, url);
	return JSON.parse(text);
}

async function fetchCachedText(key, url) {
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

client.login(process.env["D2RBOT_DISCORD_TOKEN"]);
