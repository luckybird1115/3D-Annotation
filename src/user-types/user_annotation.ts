import Three from 'three';
// import { AnnotationData, AnnotationData_Heatmap } from "../@external-lib/types/annotationData";
import { SimpleFaceWithNormal, SimpleVectorWithNormal } from "../@external-lib/types/vector";
import { AreaAnnotation, GroupAnnotation, PointAnnotation, PathAnnotation } from "@external-lib";
import { AnnotationData_Heatmap } from "@external-lib/types/annotationData";
export type AnnotationExtends = PointAnnotationExtends | PathAnnotationExtends | GroupAnnotationExtends | AreaAnnotationExtends | HeatmapAnnotationExtends ;

interface CommonAnnotationTypes {
    id: number,
    /**
     * point vector.
     */
    location: SimpleVectorWithNormal,
    /**
     * annotation title
     */
    title: string,
    /**
     * annotation description
     */
    description: string,
    /**
     * stored model face
     */
    face: SimpleFaceWithNormal,
    /**
     * stored annotation material
     */
    material: Three.MeshLambertMaterial,
    /**
     * option that is displayed on model
     */
    display: boolean,
    /**
     * option that is selected by user
     */
    select: boolean,
}

export interface PointAnnotationExtends extends PointAnnotation, CommonAnnotationTypes {

}

export interface AreaAnnotationExtends extends AreaAnnotation, CommonAnnotationTypes{
    
}

export interface GroupAnnotationExtends extends GroupAnnotation, CommonAnnotationTypes {
    
}

export interface PathAnnotationExtends extends PathAnnotation, CommonAnnotationTypes {
    
}

export interface HeatmapAnnotationExtends extends CommonAnnotationTypes {
    type: "heatmap",
    center: SimpleVectorWithNormal;
    radius: number;
    data: AnnotationData_Heatmap;
}


export function isPointAnnotationExtends(annotation: AnnotationExtends): annotation is PointAnnotationExtends {
    return annotation.type === "point";
}

export function isAreaAnnotationExtends(annotation: AnnotationExtends): annotation is AreaAnnotationExtends {
    return annotation.type === "area";
}

export function isGroupAnnotationExtends(annotation: AnnotationExtends): annotation is GroupAnnotationExtends {
    return annotation.type === "group";
}

export function isPathAnnotationExtends(annotation: AnnotationExtends): annotation is PathAnnotationExtends {
    return annotation.type === "path";
}

export function isHeatmapAnnotationExtends(annotation: AnnotationExtends): annotation is PathAnnotationExtends {
    return annotation.type === "heatmap";
}

export function visitAnnotationExtends<T>(
    annotation: AnnotationExtends,
    visitorMap: {
        area: (annotation: AreaAnnotationExtends) => T;
        group: (annotation: GroupAnnotationExtends) => T;
        path: (annotation: PathAnnotationExtends) => T;
        point: (annotation: PointAnnotationExtends) => T;
        heatmap:(annotation: HeatmapAnnotationExtends) => T;
        unknown: (obj: unknown) => T;
    }
): T {
    if (isPointAnnotationExtends(annotation)) {
        return visitorMap.point(annotation);
    }

    if (isPathAnnotationExtends(annotation)) {
        return visitorMap.path(annotation);
    }

    if (isGroupAnnotationExtends(annotation)) {
        return visitorMap.group(annotation);
    }

    if (isAreaAnnotationExtends(annotation)) {
        return visitorMap.area(annotation);
    }

    if (isHeatmapAnnotationExtends(annotation)) {
        return visitorMap.heatmap(annotation);
    }

    return visitorMap.unknown(annotation);
}