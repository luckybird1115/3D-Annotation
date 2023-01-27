import React from "react";
import './App.css';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { useLoader } from '@react-three/fiber'
import {AppLayout} from "./AppLayout";

function App() {
    const obj = useLoader(OBJLoader, 'human_model.obj');

    return (
        <AppLayout
            model={obj}
        />
    );
}

export default App;
