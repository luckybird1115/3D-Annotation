import { Vector2, Vector3 } from "three";
import * as Three from 'three';

export function getAngleBetweenVectors(first: Vector2, second: Vector2): number{
    let angle = Math.acos((first.x * second.x + first.y * second.y)/Math.sqrt((Math.pow(first.x, 2) + Math.pow(second.x, 2)) * (Math.pow(first.y, 2) + Math.pow(second.y, 2))));
    return angle;
}

export function isFrontSide(raycaster : THREE.Raycaster, camera : THREE.PerspectiveCamera, model: THREE.Object3D, objectPosition: Vector3):boolean{
    raycaster.setFromCamera(
        {
            x: 0,
            y: 0
        },
        camera
    );
    let isFront = false;
    const intersections = raycaster.intersectObject(model, true);
    if(intersections.length !== 0){
        if((Math.abs(intersections[0].point.x - objectPosition.x )< 0.5)&& (Math.abs(intersections[0].point.y - objectPosition.y ) < 0.5)&&(Math.abs(intersections[0].point.z - objectPosition.z ) < 0.5))return true;
        return isFront;
    }
    else{
        return false;
    }
}

export function getCurrentCameraTarget(raycaster : Three.Raycaster, camera : Three.PerspectiveCamera, model: Three.Object3D):any{
    raycaster.setFromCamera(
        {
            x: 0,
            y: 0
        },
        camera
    );
    const intersections = raycaster.intersectObject(model, true);
    return intersections.length? intersections[0]: 'No match';
}

export function getAngleBetweenVectors3D(vector1 : Three.Vector3, vector2: Three.Vector3): number{
    let A = vector1.x * vector2.x + vector1.y * vector2.y + vector1.z * vector2.z;
    let B = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y + vector1.z * vector1.z);
    let C = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y + vector2.z * vector2.z);
    let angle = Math.acos(A / B / C);
    return angle;
}


export function getVerticalVectorWithTwoVectors(vector1 : Three.Vector3, vector2: Three.Vector3): Three.Vector3{
    let verticalVector = new Three.Vector3(vector1.y * vector2.z - vector2.y * vector1.z, vector1.z * vector2.x - vector1.x * vector2.z, vector1.x * vector2.y - vector2.x * vector1.y)
    return verticalVector;
}