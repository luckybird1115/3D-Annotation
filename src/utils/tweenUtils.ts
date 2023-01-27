import { clamp } from "@external-lib";

/**
 * Given a `tween` ranging from `0-1`, returns the value that is at that position in the range.
 * i.e for a range from `0-10`, a `tween` of `0.5` will return `5`.
 */
export function getTween(start: number, end: number, tween: number): number {
    const distance = end - start;
    return start + distance * tween;
}

/**
 * The reverse of `getTween`. This figures out what the tween (0-1) is for a given `value`. Returns
 * a number from `0-1`.
 */
export function findTween(minValue: number, maxValue: number, value: number): number {
    return clamp((value - minValue) / (maxValue - minValue), 0, 1);
}
