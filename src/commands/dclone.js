import { SlashCommandSubcommandBuilder } from "discord.js";

import { fetchCachedJson } from "../http.js";

const DCLONE_URL = "https://diablo2.io/dclone_api.php";

const progressMessages = {
	"1": "Terror gazes upon Sanctuary",
	"2": "Terror approaches Sanctuary",
	"3": "Terror begins to form within Sanctuary",
	"4": "Terror spreads across Sanctuary",
	"5": "Terror is about to be unleashed upon Sanctuary",
	"6": "Diablo has invaded Sanctuary",
};

export const data = new SlashCommandSubcommandBuilder()
	.setName("dclone")
	.setDescription("Shows the current Diablo Clone status for Americas RotW Softcore.");

export async function execute(interaction) {
	await interaction.editReply(await getDcloneReply());
}

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
