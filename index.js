import process from "node:process";
import { Client, Events, GatewayIntentBits, SlashCommandBuilder } from "discord.js";

import * as dcloneCommand from "./src/commands/dclone.js";
import * as terrorZoneCommand from "./src/commands/tz.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const subcommands = new Map([
	[dcloneCommand.data.name, dcloneCommand],
	[terrorZoneCommand.data.name, terrorZoneCommand],
]);

const command = new SlashCommandBuilder()
	.setName("d2r")
	.setDescription("Diablo II: Resurrected tools.");

for (const subcommand of subcommands.values()) {
	command.addSubcommand(subcommand.data);
}

const token = process.env["D2RBOT_DISCORD_TOKEN"];
if (!token) {
	throw new Error("Missing D2RBOT_DISCORD_TOKEN");
}

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

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand() || interaction.commandName !== "d2r") {
		return;
	}

	await interaction.deferReply();

	try {
		const subcommand = interaction.options.getSubcommand();
		const handler = subcommands.get(subcommand);
		if (!handler) {
			await interaction.editReply("Unknown `/d2r` subcommand.");
			return;
		}

		await handler.execute(interaction);
	} catch (error) {
		console.error("Failed to handle interaction:", error);
		await interaction.editReply(`Error: ${error}. Try again in a minute.`);
	}
});

client.login(token);
