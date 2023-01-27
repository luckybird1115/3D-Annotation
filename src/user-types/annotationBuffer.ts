import {
    Annotation,
} from "@external-lib";

export type AnnotationBuffer = AnnotationBufferInterface;

export interface AnnotationBufferInterface {
    /**
     * Annotation Buffers that includes title, description and annotation(point, area, group, path).
     */
    id: Number,
    annotationType: String,
    title: String,
    description: String,
    annotation: Annotation
}