import { SimpleVector2, SimpleVector3, SimpleVectorWithNormal } from "@external-lib";
import * as Three from "three";

export function frameArea(
    sizeToFitOnScreen: number,
    boxSize: number,
    boxCenter: Three.Vector3,
    camera: Three.PerspectiveCamera
) {
    const halfSizeToFitOnScreen = sizeToFitOnScreen * 0.5;
    const halfFovY = Three.MathUtils.degToRad(camera.fov * 0.5);
    const distance = halfSizeToFitOnScreen / Math.tan(halfFovY);
    // compute a unit vector that points in the direction the camera is now
    // from the center of the box
    const direction = new Three.Vector3().subVectors(camera.position, boxCenter).normalize();

    // move the camera to a position distance units way from the center
    // in whatever direction the camera was from the center already
    camera.position.copy(direction.multiplyScalar(distance).add(boxCenter));

    // pick some near and far values for the frustum that will contain the box.
    camera.near = boxSize / 100;
    camera.far = boxSize * 100;

    camera.updateProjectionMatrix();

    // point the camera to look at the center of the box
    camera.lookAt(boxCenter.x, boxCenter.y, boxCenter.z);
}

export function getWorldPositionAndNormal(intersection: Three.Intersection<Three.Object3D>): SimpleVectorWithNormal {
    const normal = new Three.Vector3();
    normal.copy((intersection.face as THREE.Face).normal);
    normal.transformDirection(intersection.object.matrixWorld);

    const boxGeometry = new Three.BoxGeometry(0.2, 0.2, 0.2);
    const material = new Three.LineBasicMaterial({ color: 0xff0000 });
    const cube = new Three.Mesh(boxGeometry, material);

    cube.lookAt(normal);
    cube.position.copy(intersection.point);

    const worldPosition = new Three.Vector3();
    cube.getWorldPosition(worldPosition);

    return {
        x: worldPosition.x,
        y: worldPosition.y,
        z: worldPosition.z,
        normal: {
            x: normal.x,
            y: normal.y,
            z: normal.z,
        },
    };
}

export function convertWorldCoordsToScreenCoords(
    worldPosition: SimpleVector3,
    camera: Three.PerspectiveCamera,
    renderer: Three.WebGLRenderer
): SimpleVector2 {
    const locationVector = new Three.Vector3(worldPosition.x, worldPosition.y, worldPosition.z);
    locationVector.project(camera);

    const screenPosition: SimpleVector2 = {
        x: Math.round(((locationVector.x + 1) * renderer.domElement.clientWidth) / 2),
        y: Math.round(((-locationVector.y + 1) * renderer.domElement.clientHeight) / 2),
    };

    return screenPosition;
}

export function convertToThreeJSVector(simpleVec: SimpleVector3): Three.Vector3 {
    return new Three.Vector3(simpleVec.x, simpleVec.y, simpleVec.z);
}
