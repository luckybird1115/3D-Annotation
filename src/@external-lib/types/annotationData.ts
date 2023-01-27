import { IntensityValue } from "./intensity";

export type AnnotationData = AnnotationData_Heatmap | AnnotationData_Basic;

export interface AnnotationData_Heatmap {
    type: "heatmap";
    radius: number;
    intensity: IntensityValue;
}

export interface AnnotationData_Basic {
    type: "basic";
}

export function isHeatmapAnnotationData(data: AnnotationData): data is AnnotationData_Heatmap {
    return data.type === "heatmap";
}

export function isBasicAnnotationData(data: AnnotationData): data is AnnotationData_Basic {
    return data.type === "basic";
}

export function visitAnnotationData<T>(
    annotation: AnnotationData,
    visitorMap: {
        basic: (data: AnnotationData_Basic) => T;
        heatmap: (data: AnnotationData_Heatmap) => T;
        unknown: (data: unknown) => T;
    }
): T {
    if (isBasicAnnotationData(annotation)) {
        return visitorMap.basic(annotation);
    }

    if (isHeatmapAnnotationData(annotation)) {
        return visitorMap.heatmap(annotation);
    }

    return visitorMap.unknown(annotation);
}
