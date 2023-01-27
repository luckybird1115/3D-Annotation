import { Vector2, Vector3 } from "three";

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
    if((Math.abs(intersections[0].point.x - objectPosition.x )< 0.1)&& (Math.abs(intersections[0].point.y - objectPosition.y ) < 0.1)&&(Math.abs(intersections[0].point.z - objectPosition.z ) < 0.1))return true;
    return isFront;
}