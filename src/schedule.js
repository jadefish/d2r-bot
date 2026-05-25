const DEFAULT_HALF_HOUR_TOLERANCE_MS = 2 * 60 * 1000;
const HALF_HOUR_MS = 30 * 60 * 1000;

export function isHalfHourRun(date = new Date(), toleranceMs = DEFAULT_HALF_HOUR_TOLERANCE_MS) {
	const time = date.getTime();
	const distanceAfterBoundary = time % HALF_HOUR_MS;
	const distanceBeforeBoundary = HALF_HOUR_MS - distanceAfterBoundary;
	const distanceToBoundary = Math.min(distanceAfterBoundary, distanceBeforeBoundary);

	return distanceToBoundary <= toleranceMs;
}
