import React/*, { Children } */from "react";
import * as Three from "three";

import './App.css';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { useLoader } from '@react-three/fiber'
import {AppLayout} from "./AppLayout";
import { MODEL_PRIMITIVE_COLOR } from "common/colors";

function App() {
    const obj = useLoader(OBJLoader, 'human_model.obj');
    /*
    ** set vertexColors to model.
    */
    const mesh = obj.children.find((c): c is Three.Mesh => c instanceof Three.Mesh);
    let cloneGeometry = mesh?.geometry.clone();
    let model_color = new Three.Color(MODEL_PRIMITIVE_COLOR);
    const RGBValues = [model_color.r, model_color.g, model_color.b];
    if(cloneGeometry){
        const count = cloneGeometry.attributes.position.count; 
        const buffer =  new Three.BufferAttribute( new Float32Array( count * 3 ), 3 );
        cloneGeometry.setAttribute("color", buffer);

        /*
        ** set vertexColors to true and modify the vertex colors.
        */
        const colorList = new Float32Array(cloneGeometry.attributes.color.array);
        for(let i=0; i < cloneGeometry.attributes.position.array.length - 3; i += 3){
            colorList.set(RGBValues, i);
        }
        const colorsAttribute = new Three.BufferAttribute(colorList, 3, true); 
        cloneGeometry.setAttribute("color", colorsAttribute);
    }
    let cloneMaterial = new Three.MeshPhongMaterial({vertexColors: true, color: 0xaaaaaa});
    let model = new Three.Mesh(cloneGeometry, cloneMaterial);
    
    //load the model
    return (
        <AppLayout
            model={model}
        />
    );
}

export default App;
