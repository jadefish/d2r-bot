import { SlashCommandSubcommandBuilder } from "discord.js";

import areaLevels from "../data/area-levels.json" with { type: "json" };

export const data = new SlashCommandSubcommandBuilder()
	.setName("alvl")
	.setDescription("Shows area levels for matching D2R areas.")
	.addStringOption((option) =>
		option
			.setName("area")
			.setDescription("Area name or alias, such as chaos, tower, at, cows, or worldstone")
			.setRequired(true),
	);

export async function execute(interaction) {
	const query = interaction.options.getString("area", true);
	const matches = findAreaLevels(query);

	if (matches.length === 0) {
		await interaction.editReply(`No area levels found for "${query}".`);
		return;
	}

	await interaction.editReply(formatAreaLevelReply(query, matches));
}

export function findAreaLevels(query) {
	const normalizedQuery = normalize(query);
	const matches = new Set();

	for (const area of areaLevels) {
		if (normalize(area.name) === normalizedQuery) {
			matches.add(area);
		}
	}

	for (const area of areaLevels) {
		if (area.aliases.some((alias) => normalize(alias) === normalizedQuery)) {
			matches.add(area);
		}
	}

	if (normalizedQuery.length >= 3) {
		for (const area of areaLevels) {
			if ([area.name, ...area.aliases].some((value) => normalize(value).includes(normalizedQuery))) {
				matches.add(area);
			}
		}
	}

	return [...matches];
}

export function formatAreaLevelReply(query, matches) {
	const header = matches.length === 1
		? `**Area level for "${query}"**`
		: `**Area levels matching "${query}" (${matches.length})**`;

	const lines = matches.map((area) =>
		`**${area.name}** (Act ${area.act}) - Normal ${area.normal}, Nightmare ${area.nightmare}, Hell ${area.hell}`,
	);

	return [header, ...lines].join("\n");
}

function normalize(value) {
	return value
		.toLowerCase()
		.replaceAll("&", "and")
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}
