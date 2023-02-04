import * as React from "react";
import * as Three from "three";
import { Html, OrbitControls } from "@react-three/drei"
import { Canvas, RootState  } from "@react-three/fiber";
import { MeshLambertMaterial, Vector3 } from "three";
import {
    SimpleVector2,
    SimpleVectorWithNormal,
    visitAnnotationData,
    compact,
    MINIMUM_INTENSITY,
    IntensityValue,
} from "@external-lib";

import {
    AnnotationExtends,
    AreaAnnotationExtends,
    GroupAnnotationExtends,
    // PointAnnotationExtends,
    visitAnnotationExtends,
} from "user-types";

import { AREA_ANNOTATION_COLOR, getHeatmapColor, SCENE_BACKGROUND_COLOR, MODEL_PRIMITIVE_COLOR } from "../common/colors";
import { findTween, getTween } from "../utils/tweenUtils";
import { getAngleBetweenVectors3D, getVerticalVectorWithTwoVectors, isFrontSide } from '../utils/customUtils'
import {
    convertToThreeJSVector,
    convertWorldCoordsToScreenCoords,
    frameArea,
    getWorldPositionAndNormal,
} from "../utils/visualizerUtils";

import { getCurrentCameraTarget } from "../utils/customUtils";

import {
    INITIAL_CAMERA_SETTINGS,
    LIGHT_POSITION,
    ORBIT_CONTROLS_SETTINGS,
    SPHERE_GEOMETRY,
    MESH_MATERIAL,
} from "common/constants";
import { stat } from "fs/promises";



interface VisualizerProps {
    /**
     * Determines whether the canvas should be interactive. If set to `true`, you should not be able to move the camera
     */
    disableInteractions?: boolean;

    /**
     * The 3D model to display. This is loaded outside of the component, and the prop value never changes.
     */
    model: Three.Mesh;

    /**
     * The list of annotations for the given model. (@newly inserted props)
     */
    annotations: AnnotationExtends[];

    /**
     * Some models can have multiple layers that can be shown. This is a number ranging from 0-1 that indicates what the selected
     * zoom level is. Different models will interpret this value in different ways, so for now we can temporarily skip implementing it.
     */
    layerDepth: number;
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
     * Called when a right click is registered.
     * @param worldPositionAndNormal
     * @param screenPosition
     * @returns
     */
    onRightClick: (worldPositionAndNormal: SimpleVectorWithNormal, screenPosition: SimpleVector2, annoMaterial: MeshLambertMaterial) => void;

    /**
     * Called when user hide, delete or search the annotation in whole types. This is used to show annotation interactively with user's action
     * @param value Tells us whether this annotation is deleted, searched or hidden.(@newly inserted props)
     */
    setDelOrHide: (value: boolean) => void;
    /**
     * selected annotation id in the viewer controller.(@newly inserted props)
     */
    selectedAnnotation: AnnotationExtends;
    /**
     * define current state.(@newly inserted props)
     */
    currentState: String;
    /**
     * define view mode user selected.(@newly inserted props)
     */
    viewMode : string;
    /**
     * define whether this annotation should be hide or delete(@newly inserted props)
     */
    delOrHide : boolean;
}

interface VisualizerState {
    renderer: Three.WebGLRenderer;
    camera: Three.PerspectiveCamera;
    scene: Three.Scene;
    model: Three.Mesh;
    raycaster: Three.Raycaster;
}

export function Visualizer({
    disableInteractions = false,
    model,
    annotations,
    // layerDepth,
    viewMode,
    delOrHide,
    setDelOrHide,
    onReady,
    onClick,
    onRightClick,
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
    /**
     * state value for definition whether orbit control is used or not. 
     */
    const [enableOrbitControl, setEnableOrbitControl] = React.useState<string>(viewMode);

    const [cameraTarget, setCameraTarget] = React.useState<Three.Vector3>(new Three.Vector3(0,0,0));

    const groupRef = React.useRef<any>();
    const sphereRef = React.useRef<any>();
    // TODO use `layerDepth` to show the various layers of an object
    // compute the box that contains all the stuff in the model
    let ClientPointerX = 0;
    let ClientPointerY = 0;
    let enableCustomController = false;
    /**
     * useEffect function that is called when user select specific annotation
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
                    // normal of user selected point on the model.
                    const directVec = selectedAnnotation.face.normal;
                    // radius of fake sphere where camera will move and stay.
                    let radius = modelBoundingBox.max.y - modelBoundingBoxCenter.y + 2;
                    // position of annotation user selected.
                    let objectPosition = new Vector3(selectedAnnotation.location.x, selectedAnnotation.location.y, selectedAnnotation.location.z);
                    // vector from fake sphere orientation to annotation point.
                    let obj = new Vector3(selectedAnnotation.location.x - modelBoundingBoxCenter.x, selectedAnnotation.location.y - modelBoundingBoxCenter.y, selectedAnnotation.location.z - modelBoundingBoxCenter.z)
                    // getting the distance from annotation point on model to sphere point where camera will go and stay
                    let distanceB = - (directVec.x * obj.x + directVec.y * obj.y + directVec.z * obj.z);
                    let distanceA = Math.pow(directVec.x, 2) + Math.pow(directVec.y, 2) + Math.pow(directVec.z, 2);
                    let distanceD = Math.sqrt(Math.pow(distanceB, 2) - 2 * distanceA * (Math.pow(obj.x, 2) + Math.pow(obj.y, 2) + Math.pow(obj.z, 2) - Math.pow(radius, 2)));
                    let distance = (distanceB + distanceD)/distanceA;
                    // position of "view point" on the side of fake sphere.
                    let newPos = new Vector3(obj.x + distance * directVec.x, obj.y + distance * directVec.y, obj.z + distance * directVec.z);
                    //position of "view point" on the side of world.
                    let newPosition = new Vector3(newPos.x + modelBoundingBoxCenter.x, newPos.y + modelBoundingBoxCenter.y, newPos.z + modelBoundingBoxCenter.z)
                    if(state){
                    // getting the angle between two vectors, first from center of sphere to current camera, second from center of sphere to "view point".
                        let vector1 = new Three.Vector3(newPos.x - modelBoundingBoxCenter.x, newPos.y - modelBoundingBoxCenter.y, newPos.z - modelBoundingBoxCenter.z);
                        let vector2 = new Three.Vector3(state?.camera.position.x - modelBoundingBoxCenter.x, state?.camera.position.y - modelBoundingBoxCenter.y, state?.camera.position.z - modelBoundingBoxCenter.z);
                        let angleBetween = getAngleBetweenVectors3D(vector1, vector2);
                    //getting the vector of axis that is vertical with upper two vectors, we called it "view axis"
                        let verticalAxis = getVerticalVectorWithTwoVectors(vector1, vector2);
                    // update the orbit controls target
                        setOrbitControlTarget(modelBoundingBoxCenter);
                    // set the opacity of sprite to zero.
                        setSpriteOpacity(0);
                        sphereRef.current.attach(state.camera);
                        if(sphereRef.current.children.length === 1){
                            //in the begining, camera is seting the original position.
                            state.renderer.setAnimationLoop(() => {
                                state.camera.position.lerp(new Three.Vector3(sphereRef.current.position.x, sphereRef.current.position.x + modelBoundingBoxCenter.y, sphereRef.current.position.x + radius), 0.08);
                                state.camera.lookAt(modelBoundingBoxCenter);
                                // stop layouting the camera if distance is fixed.
                                if(state.camera.position.distanceTo( new Three.Vector3(sphereRef.current.position.x, sphereRef.current.position.x + modelBoundingBoxCenter.y, sphereRef.current.position.x + radius)) < 0.1){
                                    // stop camera
                                    state.renderer.setAnimationLoop(null);
                                     // starting orbit after camera layouted.
                                    console.log(angleBetween);
                                    console.log(verticalAxis);
                
                                    let realAngle = angleBetween;
                                    if(angleBetween > 0)realAngle = -angleBetween;
                                    let angle = 0;
                                    state.renderer.setAnimationLoop(() => {
                                        if(angle < -realAngle){
                                            sphereRef.current.rotateOnAxis(verticalAxis.normalize(), -0.015);
                                            angle += 0.015;
                                            state.camera.lookAt(modelBoundingBoxCenter);
                                        }
                                        else {
                                            state.renderer.setAnimationLoop(null);
                                            let cameraPosition = new Three.Vector3();
                                            let cameraDirection = new Three.Vector3();
                                            let cameraQuaturnion = new Three.Quaternion();
                                            state.camera.getWorldPosition(cameraPosition);
                                            state.camera.getWorldQuaternion(cameraQuaturnion)
                                            state.camera.getWorldDirection(cameraDirection);
                                            sphereRef.current.remove(state.camera);
                                            state.camera.updateMatrixWorld(true);
                                            state.camera.quaternion.copy(cameraQuaturnion);
                                            state.camera.position.copy(cameraPosition);
                                            state.camera.lookAt(cameraDirection);
                                        }
                                        console.log(sphereRef.current);
                                    })
                                }
                            }) 
                        }
                                           
                    }
                }
            }
        },[selectedAnnotation, viewMode]
    )
    /**
     * useEffect function that is called when user select specific view mode
     */
    React.useEffect(
        () => {
            setEnableOrbitControl(viewMode);
            if(viewMode === 'orbit'){
                setOrbitControlTarget(modelBoundingBoxCenter);
                state?.camera.lookAt(modelBoundingBoxCenter);
            }
            if(state && viewMode === 'custom'){
                let currentCameraTarget = getCurrentCameraTarget( state?.raycaster, state?.camera, state?.model).point;
                setCameraTarget(currentCameraTarget);
            }
        },[viewMode]
    )
    /**
     * useEffect function that is called when user delete, search, or hide current annotation
     */
    React.useEffect(
        () => {
            if(delOrHide){
                let mesh = state?.model;
                if(mesh){
                    let model_color = new Three.Color(MODEL_PRIMITIVE_COLOR);
                    const RGBModelValues = [model_color.r, model_color.g, model_color.b];
                    let colorList = new Float32Array(mesh.geometry.attributes.color.array);
                    for(let i=0; i < mesh.geometry.attributes.position.array.length - 3; i += 3){
                        colorList.set(RGBModelValues, i);
                    }
                    let colorsAttribute = new Three.BufferAttribute(colorList, 3, true);  //why true? and uint8
                    mesh.geometry.setAttribute("color", colorsAttribute);
                    mesh.geometry.attributes.color.needsUpdate = true;
                }
            }
            setDelOrHide(false);
        },[annotations]
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

            onClick(disableInteractions);
    }, [getClickContext, disableInteractions, onClick]);
    /**
     * useCallback function occurs when right mouse button clicked
     */
    const handleRightClick = React.useCallback(
        (ev: React.MouseEvent) => {
            state?.renderer.setAnimationLoop(null);
            const clickContext = getClickContext(ev);
            if (disableInteractions || clickContext === undefined || clickContext.intersections.length === 0) {
                return;
            }

            const { intersections, camera, renderer } = clickContext;

            intersections[0].point.y = intersections[0].point.y - groupRef.current.position.y;

            const worldPositionAndNormal = getWorldPositionAndNormal(intersections[0]);

            onRightClick(
                worldPositionAndNormal,
                convertWorldCoordsToScreenCoords(worldPositionAndNormal, camera, renderer),
                annoMaterial
            );
        },
        [disableInteractions, getClickContext, onRightClick]
    );
    
    /**
     * a set of useCallback functions for second camera scheme :: onPointerDown, onPointerMove, onPointerUp
     */
    const onPointerDown = React.useCallback(
        (ev: React.PointerEvent) => {
            if(enableOrbitControl === 'custom'){
                enableCustomController = true;
                ClientPointerX = ev.clientX;
                ClientPointerY = ev.clientY;
            }
            return ;
        },[getClickContext, disableInteractions, onClick, enableOrbitControl,viewMode]
    );
    const onPointerMove  = React.useCallback((ev: React.PointerEvent) => {
        if(enableCustomController){
            let angles = 0.25, displacement = 0.5;
            if(Math.abs((ClientPointerX-ev.clientX)/(ClientPointerY-ev.clientY)) > 1){
                if(state){
                    let angle = -angles;
                    if(ClientPointerX > ev.clientX)angle = +angles;
                    let x= state.camera.position.x;
                    let z = state.camera.position.z;
                    state.camera.position.x = x * Math.cos(angle) + z * Math.sin(angle);
                    state.camera.position.z = z * Math.cos(angle) - x * Math.sin(angle);
                    state.camera.lookAt(cameraTarget);
                } 
            }
            else{
                if(ClientPointerY > ev.clientY){
                    groupRef.current.position.y += displacement;
                }
                else {
                    groupRef.current.position.y -= displacement;
                }
            }
            ClientPointerX = ev.clientX;
            ClientPointerY = ev.clientY;
        }
    }, [getClickContext, disableInteractions, onClick, enableOrbitControl, viewMode])

    const onPointerUp  = React.useCallback((ev: React.PointerEvent) => {
        enableCustomController = false;
    }, [getClickContext, disableInteractions, onClick, enableOrbitControl, viewMode])

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
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
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
                
                {enableOrbitControl === 'orbit'? 
                <OrbitControls
                    enabled={!disableInteractions}
                    enableDamping={false}
                    enablePan={true}
                    maxDistance={modelBoundingBoxSize * 10}
                    maxZoom={ORBIT_CONTROLS_SETTINGS.maxZoom}
                    minZoom={ORBIT_CONTROLS_SETTINGS.minZoom}
                    mouseButtons={{
                        LEFT: Three.MOUSE.ROTATE,
                        MIDDLE: undefined,
                        RIGHT: Three.MOUSE.PAN,
                    }}
                    target={orbitControlTarget}
                />:
                <OrbitControls
                    enabled={!disableInteractions}
                    enableDamping={false}
                    enablePan={false}
                    maxDistance={modelBoundingBoxSize * 10}
                    maxZoom={ORBIT_CONTROLS_SETTINGS.maxZoom}
                    minZoom={ORBIT_CONTROLS_SETTINGS.minZoom}
                    mouseButtons={{
                        LEFT: undefined,
                        MIDDLE: undefined,
                        RIGHT: undefined,
                    }}
                    target={orbitControlTarget}
                />}
            <group ref={groupRef}>
            <mesh 
                ref={sphereRef}
                position={new Three.Vector3(0,modelBoundingBoxCenter.y,0)}
                geometry={new Three.SphereGeometry(modelBoundingBox.max.y - modelBoundingBoxCenter.y + 2, modelBoundingBox.max.y - modelBoundingBoxCenter.y + 2 * 3 , modelBoundingBox.max.y - modelBoundingBoxCenter.y + 2 * 3)}
                material={new Three.MeshLambertMaterial({wireframe: true, visible: false})}
            />
            <primitive object={model}/>
            {annotations.map((annotation) =>
                visitAnnotationExtends(annotation, {
                    area: (a) => renderAreaAnnotation(a, model, handleOpacity, setAnnoId, annoMaterial, annoId),
                    group: (a) => <>{renderGroupAnnotation(a, model, handleOpacity, setAnnoId, annoMaterial, annoId)}</>, // not sure if this is a good way to do things
                    point: (a) => renderPointAnnotation(a, model, handleOpacity, setAnnoId, annoMaterial, annoId),
                    path: () => undefined, // Paths are not currently supported, ignore this
                    heatmap:(a) => renderPointAnnotation(a, model, handleOpacity, setAnnoId, annoMaterial, annoId),
                    unknown: () => undefined,
                })
            )}
            {annotations.map((annotation) =>
                visitAnnotationExtends(annotation, {
                    area: (a) => renderSprite(a, a.center, 0.2, 'red', 60, annoId),
                    group: (a) => undefined, // not sure if this is a good way to do things
                    point: (a) => renderSprite(a, a.location, spriteOpacity, 'red', 60, annoId),
                    path: () => undefined, // Paths are not currently supported, ignore this
                    heatmap: (a) =>  renderSprite(a, a.center, 0.2, 'red', 60, annoId),
                    unknown: () => undefined,
                })
            )}
            </group>
        </Canvas>
    );
}
/**
 * rendre area annotation
 */
function renderAreaAnnotation(annotation: AreaAnnotationExtends, model: Three.Mesh, handleOpacity: Function, setAnnoId:Function, annoMaterial: Three.MeshLambertMaterial, annoId:number): JSX.Element | undefined {
    
    let mesh = model;
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
function renderGroupAnnotation(annotation: GroupAnnotationExtends, model: Three.Object3D, handleOpacity: Function, setAnnoId:Function, annoMaterial: Three.MeshLambertMaterial, annoId:number): JSX.Element[] {
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
function renderPointAnnotation(annotation: AnnotationExtends, model: Three.Mesh, handleOpacity: Function, setAnnoId: Function, annoMaterial: Three.MeshLambertMaterial, annoId:number): JSX.Element | undefined {
    return visitAnnotationData<JSX.Element | undefined>(annotation.data, {
        basic: () => renderPoint(annotation, handleOpacity, setAnnoId, annoMaterial, annoId),
        heatmap: (heatmap) => {
            // NOTE: This was my attempt at rendering heatmaps. The strategy was to color the vertices of the mesh based on how far
            // away it was from the center of the annotation, but it's not a great solution since it's hard to "un-color" the vertices
            // when an annotation is deleted and this also probably won't work if the model has textures. I will leave the implementation
            // here for you to see but feel free to delete it and write a new implementation.
            let mesh = model;
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
function renderPoint(annotation: AnnotationExtends, handleOpacity: Function, setAnnoId:Function, annoMaterial: Three.MeshLambertMaterial, annoId: number): JSX.Element {
    //function to show or hide this annotation sprite
    const onMouseOverAnnotaion = () => {
        handleOpacity(0.6);
        setAnnoId(annotation.id);
    }
    const onMouseLeaveAnnotaion = () => {
        handleOpacity(0);
        setAnnoId(0);
    }
    let key = annotation.id;
    let key1 = annotation.id + 1;
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
function renderSprite(annotation: AnnotationExtends, position: SimpleVectorWithNormal, opacity: number, color = 'red', fontSize = 60, annoId: number ):JSX.Element | undefined {
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