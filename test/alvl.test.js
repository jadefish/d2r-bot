import assert from "node:assert/strict";
import test from "node:test";

import { execute, findAreaLevels, formatAreaLevelReply } from "../src/commands/alvl.js";

test("findAreaLevels returns exact alias matches", () => {
	const matches = findAreaLevels("at");

	assert.deepEqual(matches.map((area) => area.name), ["Ancient Tunnels"]);
	assert.equal(matches[0].hell, 85);
});

test("findAreaLevels returns all ambiguous partial matches", () => {
	const matches = findAreaLevels("tower");

	assert.deepEqual(matches.map((area) => area.name), [
		"Tower Cellar Level 1",
		"Tower Cellar Level 2",
		"Tower Cellar Level 3",
		"Tower Cellar Level 4",
		"Tower Cellar Level 5",
	]);
});

test("formatAreaLevelReply includes all difficulty area levels", () => {
	const reply = formatAreaLevelReply("chaos", findAreaLevels("chaos"));

	assert.match(reply, /^\*\*Area level for "chaos"\*\*/);
	assert.match(reply, /\*\*The Chaos Sanctuary\*\* \(Act 4\) - Normal 28, Nightmare 58, Hell 85/);
});

test("execute replies with a not found message", async () => {
	let reply;
	await execute({
		options: {
			getString: () => "definitely not an area",
		},
		editReply: (message) => {
			reply = message;
		},
	});

	assert.equal(reply, 'No area levels found for "definitely not an area".');
});
