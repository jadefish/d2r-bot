#!/usr/bin/env node

import process from "node:process";
import { REST, Routes } from "discord.js";

import { isHalfHourRun } from "../src/schedule.js";
import { getTerrorZoneReply } from "../src/terror-zone.js";

if (!isHalfHourRun()) {
	console.log("Skipping terror zone post because this run is not near :00 or :30 UTC.");
	process.exit(0);
}

const token = process.env["D2RBOT_DISCORD_TOKEN"];
if (!token) {
	throw new Error("Missing D2RBOT_DISCORD_TOKEN");
}

const channelId = process.env["D2RBOT_TZ_CHANNEL_ID"];
if (!channelId) {
	throw new Error("Missing D2RBOT_TZ_CHANNEL_ID");
}

try {
	const content = await getTerrorZoneReply();
	const rest = new REST({ version: "10" }).setToken(token);

	await rest.post(Routes.channelMessages(channelId), {
		body: {
			content,
			allowed_mentions: { parse: [] },
		},
	});

	console.log(`Posted terror zone status to channel ${channelId}`);
} catch (error) {
	console.error("Failed to post terror zone status:", error);
	process.exitCode = 1;
}
