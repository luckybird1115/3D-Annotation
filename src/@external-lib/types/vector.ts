/**
 * The rest of the app is not aware of Three.JS, so it uses these simpler vector types to store coordinates.
 */

export interface SimpleVector3 {
    x: number;
    y: number;
    z: number;
}

export interface SimpleVector2 {
    x: number;
    y: number;
}

export interface SimpleVectorWithNormal extends SimpleVector3 {
    normal: SimpleVector3;
}

export interface SimpleFaceWithNormal extends SimpleVector3 {
    a: number,
    b: number,
    c: number,
    materialIndex: number,
    normal: SimpleVector3
}