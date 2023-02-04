import { AnnotationData, AnnotationData_Heatmap } from "./annotationData";
import {SimpleVectorWithNormal } from "./vector";
export type Annotation = PointAnnotation | PathAnnotation | GroupAnnotation | AreaAnnotation;

interface CommonAnnotationProps {
    /**
     * Stored annotation data.
     */
    data: AnnotationData;
}

/**
 * Annotation attached to a single point on the model.
 */
export interface PointAnnotation extends CommonAnnotationProps {
    type: "point";

    /**
     * The location of the point on the model.
     */
    location: SimpleVectorWithNormal;
}

/**
 * Annotation that defines an area of the model as a circle.
 */
export interface AreaAnnotation extends CommonAnnotationProps {
    type: "area";
    /**
     * The location of the center of the circle on the model.
     */
    center: SimpleVectorWithNormal;
    radius: number;
    data: Exclude<AnnotationData, AnnotationData_Heatmap>;
}

/**
 * Annotation that traverses a series of points on the model. Useful for arrows, directional lines, and pen scribbles.
 */
export interface PathAnnotation extends CommonAnnotationProps {
    type: "path";
    points: SimpleVectorWithNormal[];
}

/**
 * Annotation that specifies groups on the object that it is attached to.
 * For example, if the model were a human, the groups could be `"wrist, hand, thumb"`.
 */
export interface GroupAnnotation extends CommonAnnotationProps {
    type: "group";
    groupIds: string[];
}

export function isPointAnnotation(annotation: Annotation): annotation is PointAnnotation {
    return annotation.type === "point";
}

export function isAreaAnnotation(annotation: Annotation): annotation is AreaAnnotation {
    return annotation.type === "area";
}

export function isGroupAnnotation(annotation: Annotation): annotation is GroupAnnotation {
    return annotation.type === "group";
}

export function isPathAnnotation(annotation: Annotation): annotation is PathAnnotation {
    return annotation.type === "path";
}

export function visitAnnotation<T>(
    annotation: Annotation,
    visitorMap: {
        area: (annotation: AreaAnnotation) => T;
        group: (annotation: GroupAnnotation) => T;
        path: (annotation: PathAnnotation) => T;
        point: (annotation: PointAnnotation) => T;
        unknown: (obj: unknown) => T;
    }
): T {
    if (isPointAnnotation(annotation)) {
        return visitorMap.point(annotation);
    }

    if (isPathAnnotation(annotation)) {
        return visitorMap.path(annotation);
    }

    if (isGroupAnnotation(annotation)) {
        return visitorMap.group(annotation);
    }

    if (isAreaAnnotation(annotation)) {
        return visitorMap.area(annotation);
    }

    return visitorMap.unknown(annotation);
}