import { SlashCommandSubcommandBuilder } from "discord.js";

import { fetchCachedText } from "../http.js";

const TERROR_ZONE_URL = "https://d2emu.com/tz";

const immunityEmojis = {
	Cold: "🧊",
	Fire: "🔥",
	Lightning: "⚡",
	Magic: "✨",
	Physical: "🗡️",
	Poison: "☠️",
};

export const data = new SlashCommandSubcommandBuilder()
	.setName("tz")
	.setDescription("Shows the current and next terror zone.");

export async function execute(interaction) {
	await interaction.editReply(await getTerrorZoneReply());
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
