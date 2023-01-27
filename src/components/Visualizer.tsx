import * as React from "react";
import * as Three from "three";
import { Html } from "@react-three/drei"
import {
    Annotation,
    SimpleVector2,
    SimpleVectorWithNormal,
    SimpleFaceWithNormal,
    visitAnnotation,
    AreaAnnotation,
    GroupAnnotation,
    PointAnnotation,
    visitAnnotationData,
    compact,
    MINIMUM_INTENSITY,
    IntensityValue,
} from "@external-lib";

import { Canvas, RootState  } from "@react-three/fiber";
import { AREA_ANNOTATION_COLOR, getHeatmapColor, SCENE_BACKGROUND_COLOR } from "../common/colors";
import { findTween, getTween } from "../utils/tweenUtils";
import {
    convertToThreeJSVector,
    convertWorldCoordsToScreenCoords,
    frameArea,
    getWorldPositionAndNormal,
} from "../utils/visualizerUtils";
import {
    INITIAL_CAMERA_SETTINGS,
    LIGHT_POSITION,
    ORBIT_CONTROLS_SETTINGS,
    SPHERE_GEOMETRY,
    MESH_MATERIAL,
} from "common/constants";
import { Vector3 } from "three";
import { OrbitControls } from "@react-three/drei";
import {isFrontSide} from '../utils/customUtils'
import { positions } from "@mui/system";

interface VisualizerProps {
    /**
     * Determines whether the canvas should be interactive. If set to `true`, you should not be able to move the camera
     */
    disableInteractions?: boolean;

    /**
     * The 3D model to display. This is loaded outside of the component, and the prop value never changes.
     */
    model: Three.Object3D<Three.Event>;

    /**
     * The list of annotations for the given model.
     */
    annotations: Annotation[];

    /**
     * Some models can have multiple layers that can be shown. This is a number ranging from 0-1 that indicates what the selected
     * zoom level is. Different models will interpret this value in different ways, so for now we can temporarily skip implementing it.
     */
    layerDepth: number;
    /**
     * Various types of annotations.
     */
    annotationType:string
    /**
     * Called when the canvas is ready.
     */
    onReady: () => void;

    /**
     * Called when a left click is registered. Unlike the other click listeners, this is always called even if `disableInteractions` is `true`.
     * @param wasClickIgnored Tells us whether interactions are disabled (this value is equal to `disableInteractions`)
     */
    onClick: (wasClickIgnored: boolean) => void;

    /**
     * Called when a model is clicked.
     * @param annotation
     */
    selectAnnotation: (annotation: Annotation) => void;

    /**
     * Called when a right click is registered.
     * @param worldPositionAndNormal
     * @param screenPosition
     * @returns
     */
    onRightClick: (worldPositionAndNormal: SimpleVectorWithNormal, screenPosition: SimpleVector2) => void;

    /**
     * selected annotation id in the viewer controller.
     */
    selectedAnnotation: Annotation;
}

interface VisualizerState {
    renderer: Three.WebGLRenderer;
    camera: Three.PerspectiveCamera;
    scene: Three.Scene;
    model: Three.Object3D;
    raycaster: Three.Raycaster;
}

export function Visualizer({
    disableInteractions = false,
    model,
    annotations,
    annotationType,
   // layerDepth,
    onReady,
    onClick,
    onRightClick,
    selectAnnotation,
    selectedAnnotation
}: VisualizerProps) {
    /**
     * For getting variables related to model.
     */
    const modelBoundingBox = new Three.Box3().setFromObject(model);
    const modelBoundingBoxSize = modelBoundingBox.getSize(new Three.Vector3()).length();
    const modelBoundingBoxCenter = modelBoundingBox.getCenter(new Three.Vector3());

    const [state, setState] = React.useState<VisualizerState>();
    /**
     * state variable for orbitControl target
     */
    const [orbitControlTarget, setOrbitControlTarget] = React.useState<Three.Vector3>(modelBoundingBoxCenter);
    /**
     * opacity value for hide and show tooltip when user hover annotation.
     */
    const [spriteOpacity, setSpriteOpacity] = React.useState<number>(0);
    /**
     * annotation Id and material 
     */
    const [annoId, setAnnoId] = React.useState<number>(1);
    const [annoMaterial, setAnnoMaterial] = React.useState<Three.MeshLambertMaterial>(MESH_MATERIAL);
    // TODO use `layerDepth` to show the various layers of an object
    // compute the box that contains all the stuff in the model
    

    /**
     * useEffect function
     */
    React.useEffect(
        () => {
            if (selectedAnnotation) {
                /**
                 * change the color of annotation when user hover specific annotation
                 */
                setAnnoId(selectedAnnotation.id);
                setAnnoMaterial(new Three.MeshLambertMaterial({
                    emissive: new Three.Color('#fff'),
                    emissiveIntensity: 0.45,
                }))
                /**
                 * animate the camera and move for focusing currnet annotation when user click annotation bar
                 */
                if(selectedAnnotation.face){
                    const directVec = selectedAnnotation.face.normal;
                    const distance = modelBoundingBox.max.x - modelBoundingBox.min.x > modelBoundingBox.max.z - modelBoundingBox.min.z? (modelBoundingBox.max.x - modelBoundingBox.min.x)/1.5: (modelBoundingBox.max.z - modelBoundingBox.min.z)/1.5;
                    let objectPosition = new Vector3(selectedAnnotation.location.x, selectedAnnotation.location.y, selectedAnnotation.location.z);
                    setOrbitControlTarget(objectPosition);
                    setSpriteOpacity(0);
                    const newPosition = new Three.Vector3(selectedAnnotation.location.x + directVec.x * distance, selectedAnnotation.location.y + directVec.y * distance, selectedAnnotation.location.z + directVec.z * distance);
                    let angle = 0.04;
                    let totalAngle = 0;
                    let opacity = 0;
                    state?.renderer.setAnimationLoop(() => {
                        let x = state.camera.position.x;
                        let z = state.camera.position.z;
                        totalAngle += angle;
                        if(totalAngle > Math.PI * 4){
                            opacity += 0.003;
                            if(opacity > 0.7) opacity = 0.7;
                            setSpriteOpacity(opacity);
                            state.camera.position.lerp(newPosition, 0.01);
                        }else{
                            if(((newPosition.x - x)/directVec.x > (newPosition.z - z)/directVec.z)){
                                state.camera.position.x = x * Math.cos(angle) + z * Math.sin(angle);
                                state.camera.position.z = z * Math.cos(angle) - x * Math.sin(angle);
                            }else{
                                if(isFrontSide(state.raycaster, state.camera, state.model, objectPosition)){
                                    state.camera.position.lerp(newPosition, 0.01);
                                    opacity += 0.003;
                                    if(opacity > 0.7) opacity = 0.7;
                                    setSpriteOpacity(opacity);
                                }
                                else{
                                    state.camera.position.x = x * Math.cos(angle) + z * Math.sin(angle);
                                    state.camera.position.z = z * Math.cos(angle) - x * Math.sin(angle);
                                }
                            }
                        }
                        state.camera.lookAt(objectPosition);    
                    })
                }
            }
        },[selectedAnnotation]
    )
    /**
     * useCallback function to get point user clicked over model
     */  
    const getClickContext = React.useCallback(
        (event: React.MouseEvent) => {
            if (state === undefined) {
                return undefined;
            }
            state.raycaster.setFromCamera(
                {
                    x: (event.clientX / state.renderer.domElement.clientWidth) * 2 - 1,
                    y: -(event.clientY / state.renderer.domElement.clientHeight) * 2 + 1,
                },
                state.camera
            );

            const intersections = state.raycaster.intersectObject(model, true);

            return {
                intersections,
                camera: state.camera,
                renderer: state.renderer,
            };
        },
        [model, state]
    );
    /**
     * useCallback function to set the initial setting for canvas
     */
    const handleCanvasCreated = React.useCallback(
        (rootState: RootState) => {
            rootState.scene.background = new Three.Color(SCENE_BACKGROUND_COLOR);
            // set the camera to frame the model into view
            frameArea(
                modelBoundingBoxSize * 1.2,
                modelBoundingBoxSize,
                modelBoundingBoxCenter,
                rootState.camera as Three.PerspectiveCamera
            );

            setState({
                camera: rootState.camera as Three.PerspectiveCamera,
                renderer: rootState.gl,
                scene: rootState.scene,
                model,
                raycaster: rootState.raycaster,
            });

            onReady(
                
            );
        },
        [model, modelBoundingBoxCenter, modelBoundingBoxSize, onReady]
    );

    /**
     * useCallback function to calculate various funcitons
     */
    const handleClick = React.useCallback(
        (ev: React.MouseEvent) => {
            //here, exit the camera animation
            state?.renderer.setAnimationLoop(null);
            //get the x,y,z position user clicked over model
            const clickContext = getClickContext(ev);
            if (disableInteractions || clickContext === undefined || clickContext.intersections.length === 0) {
                return;
            }
            const { intersections/*, camera, renderer*/ } = clickContext;
            //annotation filter
            switch (annotationType) {
                case 'point':
                    selectAnnotation({
                        type: "point",
                        location: {
                            x: intersections[0].point.x, y: intersections[0].point.y, z: intersections[0].point.z
                        } as SimpleVectorWithNormal,
                        face: intersections[0].face as unknown as SimpleFaceWithNormal,
                        material: annoMaterial, 
                        data: {
                            type: 'basic'
                        },
                        display: true,
                        select: false
                    } as PointAnnotation);
                    break;
                case 'area':
                    selectAnnotation({
                        type: "area",
                        center: {
                            x: intersections[0].point.x, y: intersections[0].point.y, z: intersections[0].point.z,
                        } as SimpleVectorWithNormal,
                        radius: 20,
                        data: {
                            type: 'basic'
                        }
                    } as AreaAnnotation);
                    break;
                case 'Group':
                    break;
                default:
                    break;
            }
            onClick(disableInteractions);
    }, [getClickContext, disableInteractions, onClick]);
    /**
     * useCallback function occurs when right mouse button clicked
     */
    const handleRightClick = React.useCallback(
        (ev: React.MouseEvent) => {
            const clickContext = getClickContext(ev);

            if (disableInteractions || clickContext === undefined || clickContext.intersections.length === 0) {
                return;
            }

            const { intersections, camera, renderer } = clickContext;

            const worldPositionAndNormal = getWorldPositionAndNormal(intersections[0]);

            onRightClick(
                worldPositionAndNormal,
                convertWorldCoordsToScreenCoords(worldPositionAndNormal, camera, renderer)
            );
        },
        [disableInteractions, getClickContext, onRightClick]
    );

    /**
     * useCallback function to set the annotation opacity
     */
    const handleOpacity = React.useCallback((value: number) => 
    {
        setSpriteOpacity(value);
    },[]);

    return (
        <Canvas
            onClick={handleClick}
            onContextMenu={handleRightClick}
            resize={{ debounce: 50 }}
            style={{
                width: "100%",
                height: "100%",
                display: "block",
            }}
            camera={INITIAL_CAMERA_SETTINGS}
            onCreated={handleCanvasCreated}
        >
            <directionalLight color={0xffffff} intensity={1} position={LIGHT_POSITION} />
            <OrbitControls
                enabled={!disableInteractions}
                enableDamping={true}
                enablePan={true}
                maxDistance={modelBoundingBoxSize * 10}
                maxZoom={ORBIT_CONTROLS_SETTINGS.maxZoom}
                minZoom={ORBIT_CONTROLS_SETTINGS.minZoom}
                mouseButtons={{
                    LEFT: Three.MOUSE.ROTATE,
                    MIDDLE: undefined,
                    RIGHT: undefined,
                }}
                target={orbitControlTarget}
            />
            <primitive object={model}/>
            {annotations.map((annotation) =>
                visitAnnotation(annotation, {
                    area: (a) => renderAreaAnnotation(a, model, handleOpacity, setAnnoId, annoMaterial, annoId),
                    group: (a) => <>{renderGroupAnnotation(a, model, handleOpacity, setAnnoId, annoMaterial, annoId)}</>, // not sure if this is a good way to do things
                    point: (a) => renderPointAnnotation(a, model, handleOpacity, setAnnoId, annoMaterial, annoId),
                    path: () => undefined, // Paths are not currently supported, ignore this
                    unknown: () => undefined,
                })
            )}
            {annotations.map((annotation) =>
                visitAnnotation(annotation, {
                    area: (a) => renderSprite(a, a.center, 0.2, 'red', 60, annoId),
                    group: (a) => undefined, // not sure if this is a good way to do things
                    point: (a) => renderSprite(a, a.location, spriteOpacity, 'red', 60, annoId),
                    path: () => undefined, // Paths are not currently supported, ignore this
                    unknown: () => undefined,
                })
            )}
        </Canvas>
    );
}
/**
 * rendre area annotation
 */
function renderAreaAnnotation(annotation: AreaAnnotation, model: Three.Object3D, handleOpacity:Function, setAnnoId:Function, annoMaterial: Three.MeshLambertMaterial, annoId: number): JSX.Element | undefined {
    const mesh = model.children.find((c): c is Three.Mesh => c instanceof Three.Mesh);
    if (mesh === undefined) {
        return renderPoint(annotation, handleOpacity, setAnnoId, annoMaterial, annoId);
    }
    
    if(!mesh.geometry.attributes.color){	    
        let count = mesh.geometry.attributes.position.count;
        mesh.geometry.setAttribute( 'color', new Three.BufferAttribute( new Float32Array( count * 3 ), 3 ) );
    }
    const colorList = new Float32Array(mesh.geometry.attributes.color.array);
    const geometryPositionsArray = Array.from(mesh.geometry.getAttribute("position").array);
    const vertex = new Three.Vector3();
    const areaCenter = new Three.Vector3(annotation.center.x, annotation.center.y, annotation.center.z);
    const color = new Three.Color(AREA_ANNOTATION_COLOR);
    const rgbValues = [color.r, color.g, color.b];
    for (let i = 0; i <= geometryPositionsArray.length - 3; i += 3) {
        vertex.set(geometryPositionsArray[i], geometryPositionsArray[i + 1], geometryPositionsArray[i + 2]);
        const distance = vertex.distanceTo(areaCenter);
        // if this vertex is within the radius, color it
        if (distance <= annotation.radius) {
            colorList.set(rgbValues, i);
        }
    }
    // note: this will only work for non indexed geometry
    const colorsAttribute = new Three.BufferAttribute(colorList, 3);
    mesh.geometry.setAttribute("color", colorsAttribute);
    mesh.geometry.attributes.color.needsUpdate = true;
    
    return renderPoint(annotation, handleOpacity, setAnnoId, annoMaterial, annoId);
}
/**
 * render group annotation
 */
function renderGroupAnnotation(annotation: GroupAnnotation, model: Three.Object3D, handleOpacity: Function, setAnnoId:Function, annoMaterial: Three.MeshLambertMaterial, annoId:number): JSX.Element[] {
    return compact(
        annotation.groupIds.map((group) => {
            const obj = model.getObjectByName(group);

            if (!(obj instanceof Three.Mesh) || !(obj.geometry instanceof Three.BufferGeometry)) {
                return undefined;
            }

            if (obj.geometry.boundingBox === null) {
                obj.geometry.computeBoundingBox();
            }

            const boundingBox = obj.geometry.boundingBox!;

            const center = new Three.Vector3();
            boundingBox.getCenter(center);

            return renderPoint(
                annotation, handleOpacity, setAnnoId, annoMaterial, annoId
            //     {
            //     x: center.x,
            //     y: center.y,
            //     z: boundingBox.max.z, // wip(3d) find a better way to stick this on the surface of the model
            //     normal: { x: 0, y: 0, z: 0 },
            // }

            );
        })
    );
}
/**
 * render point annotation
 */
function renderPointAnnotation(annotation: PointAnnotation, model: Three.Object3D, handleOpacity: Function, setAnnoId: Function, annoMaterial: Three.MeshLambertMaterial, annoId:number): JSX.Element | undefined {
    return visitAnnotationData<JSX.Element | undefined>(annotation.data, {
        basic: () => renderPoint(annotation, handleOpacity, setAnnoId, annoMaterial, annoId),
        heatmap: (heatmap) => {
            // NOTE: This was my attempt at rendering heatmaps. The strategy was to color the vertices of the mesh based on how far
            // away it was from the center of the annotation, but it's not a great solution since it's hard to "un-color" the vertices
            // when an annotation is deleted and this also probably won't work if the model has textures. I will leave the implementation
            // here for you to see but feel free to delete it and write a new implementation.

            const mesh = model.children.find((c): c is Three.Mesh => c instanceof Three.Mesh);
            if (mesh === undefined) {
                return renderPoint(annotation, handleOpacity, setAnnoId, annoMaterial, annoId);
            }
            const colorList = new Float32Array(mesh.geometry.attributes.color.array);
            const geometryPositionsArray = Array.from(mesh.geometry.getAttribute("position").array);
            const vertex = new Three.Vector3();
            const heatMapCenter = new Three.Vector3(
                annotation.location.x,
                annotation.location.y,
                annotation.location.z
            );
            for (let i = 0; i <= geometryPositionsArray.length - 3; i += 3) {
                vertex.set(geometryPositionsArray[i], geometryPositionsArray[i + 1], geometryPositionsArray[i + 2]);
                const distance = vertex.distanceTo(heatMapCenter);

                // if this vertex is within the heatmap radius, get the color based on the distance
                if (distance <= heatmap.radius) {
                    // invert the tween to get the colors in the right order
                    const tween = 1 - findTween(0, heatmap.radius, distance);
                    const intensity = getTween(MINIMUM_INTENSITY, heatmap.intensity, tween);
                    const color = getHeatmapColor(intensity as IntensityValue);

                    // Color values apparently have to range from 0-1
                    colorList.set([color.red() / 255, color.green() / 255, color.blue() / 255], i);
                }
            }

            // note: this will only work for non indexed geometry
            const colorsAttribute = new Three.BufferAttribute(colorList, 3, true);  //why true? and uint8
            mesh.geometry.setAttribute("color", colorsAttribute);
            mesh.geometry.attributes.color.needsUpdate = true;
            return renderPoint(annotation, handleOpacity, setAnnoId, annoMaterial, annoId);
        },
        unknown: () => undefined,
    });
}

// Just renders a sphere as annotation
function renderPoint(annotation: Annotation, handleOpacity: Function, setAnnoId:Function, annoMaterial: Three.MeshLambertMaterial, annoId:number): JSX.Element {
    //function to show or hide this annotation sprite
    const onMouseOverAnnotaion = () => {
        handleOpacity(0.6);
        setAnnoId(annotation.id);
    }
    const onMouseLeaveAnnotaion = () => {
        handleOpacity(0);
        setAnnoId(0);
    }

    let key = 0;
    if (annotation.id) key = annotation.id;

    return (
        <mesh
            onPointerOver={onMouseOverAnnotaion}
            onPointerLeave={onMouseLeaveAnnotaion}
            geometry={SPHERE_GEOMETRY}
            material={annoId === annotation.id?annoMaterial: MESH_MATERIAL}
            position={convertToThreeJSVector(annotation.location)}
            key={key}
        />
    );
}
//just render html component as sprite
function renderSprite(annotation: Annotation, position: SimpleVectorWithNormal, opacity: number, color = 'red', fontSize = 60, annoId: number ):JSX.Element | undefined {
    if (annotation === undefined) return;
    if (annoId !== annotation.id) opacity = 0;
    if (annotation.title === undefined) return;

    let key = 0;
    if (annotation.id) key = annotation.id;

    return (
        <Dodecahedron position={[annotation.location.x, annotation.location.y, annotation.location.z]} opacity={opacity} title={annotation.title} description={annotation.description} key={key}/>
    )
}
function Dodecahedron({ ...props }) {
    return (
        <mesh {...props}>
            <Html distanceFactor={30}>
                <div style={{paddingTop : '12px', width: props.title.length * 4 + 40 + 'px', textAlign: 'left', background: 'rgba(2,2,2,0.8)', color: 'white', padding: '10px 5px',  borderRadius: '5px', opacity: props.opacity}}>
                <h4 style={{padding: '0', margin: '0', color: 'red'}}>{props.title}</h4>
                <p style={{padding: '0', margin: '0', fontSize: '10px '}}>{props.description}</p>
                </div>
            </Html>
        </mesh>
    )
}