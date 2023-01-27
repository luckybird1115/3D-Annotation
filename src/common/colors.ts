import { isInRange, MAXIMUM_INTENSITY, MINIMUM_INTENSITY, IntensityValue } from "@external-lib";
import { color as createColor, ColorHelper, rgb } from "csx/lib/color";
import { findTween, getTween } from "../utils/tweenUtils";

export const SCENE_BACKGROUND_COLOR = "#7b89a2";
export const DEFAULT_ANNOTATION_COLOR = "#fff";
export const POINT_ANNOTATION_COLOR = "#f00";

const HEATMAP_COLORS = [
    [0.0, createColor("#dcdcdc")],
    [0.2, createColor("#9bbcff")],
    [0.5, createColor("#3c4ec2")],
    [0.8, createColor("#f6a385")],
    [1.0, createColor("#b40426")],
] as const;

export const AREA_ANNOTATION_COLOR = "#1483fe";

export function getHeatmapColor(intensity: IntensityValue): ColorHelper {
    const majorTween = findTween(MINIMUM_INTENSITY, MAXIMUM_INTENSITY, intensity);

    let previousThresholdIndex: number | undefined;
    let nextThresholdIndex: number | undefined;

    // Start at 1 so there is always a previous entry
    for (let i = 1; i < HEATMAP_COLORS.length; i++) {
        const currentThreshold = HEATMAP_COLORS[i][0];
        const prevThreshold = HEATMAP_COLORS[i - 1][0];

        if (isInRange(majorTween, prevThreshold, currentThreshold)) {
            previousThresholdIndex = i - 1;
            nextThresholdIndex = i;
            break;
        }
    }

    if (previousThresholdIndex === undefined || nextThresholdIndex === undefined) {
        throw Error("Unable to compute heatmap color");
    }

    const previousThreshold = HEATMAP_COLORS[previousThresholdIndex];
    const nextThreshold = HEATMAP_COLORS[nextThresholdIndex];
    const minorTween = findTween(previousThreshold[0], nextThreshold[0], majorTween);

    return rgb(
        getTween(previousThreshold[1].red(), nextThreshold[1].red(), minorTween),
        getTween(previousThreshold[1].green(), nextThreshold[1].green(), minorTween),
        getTween(previousThreshold[1].blue(), nextThreshold[1].blue(), minorTween)
    );
}
