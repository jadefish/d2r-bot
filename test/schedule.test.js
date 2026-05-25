import assert from "node:assert/strict";
import test from "node:test";

import { isHalfHourRun } from "../src/schedule.js";

test("isHalfHourRun allows exact hour and half-hour runs", () => {
	assert.equal(isHalfHourRun(new Date("2026-05-25T12:00:00Z")), true);
	assert.equal(isHalfHourRun(new Date("2026-05-25T12:30:00Z")), true);
});

test("isHalfHourRun allows small drift around hour and half-hour runs", () => {
	assert.equal(isHalfHourRun(new Date("2026-05-25T11:59:30Z")), true);
	assert.equal(isHalfHourRun(new Date("2026-05-25T12:01:59Z")), true);
	assert.equal(isHalfHourRun(new Date("2026-05-25T12:29:30Z")), true);
	assert.equal(isHalfHourRun(new Date("2026-05-25T12:31:59Z")), true);
});

test("isHalfHourRun skips runs outside the drift tolerance", () => {
	assert.equal(isHalfHourRun(new Date("2026-05-25T12:02:01Z")), false);
	assert.equal(isHalfHourRun(new Date("2026-05-25T12:27:59Z")), false);
	assert.equal(isHalfHourRun(new Date("2026-05-25T12:32:01Z")), false);
});

test("isHalfHourRun skips other ten-minute scheduler runs", () => {
	assert.equal(isHalfHourRun(new Date("2026-05-25T12:10:00Z")), false);
	assert.equal(isHalfHourRun(new Date("2026-05-25T12:20:00Z")), false);
	assert.equal(isHalfHourRun(new Date("2026-05-25T12:40:00Z")), false);
	assert.equal(isHalfHourRun(new Date("2026-05-25T12:50:00Z")), false);
});

test("isHalfHourRun accepts a custom tolerance", () => {
	assert.equal(isHalfHourRun(new Date("2026-05-25T12:04:00Z"), 5 * 60 * 1000), true);
	assert.equal(isHalfHourRun(new Date("2026-05-25T12:06:00Z"), 5 * 60 * 1000), false);
});
