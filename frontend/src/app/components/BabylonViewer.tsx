"use client";
import { useEffect, useRef } from "react";
import "@babylonjs/loaders";

export default function BabylonViewer({ modelUrl }: { modelUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !modelUrl) return;

    const initViewer = async () => {
      try {
        //Imports
        const { Engine } = await import("@babylonjs/core/Engines/engine");
        const { Scene } = await import("@babylonjs/core/scene");
        const { ArcRotateCamera } = await import("@babylonjs/core/Cameras/arcRotateCamera");
        const { Vector3 } = await import("@babylonjs/core/Maths/math.vector");
        const { HemisphericLight } = await import("@babylonjs/core/Lights/hemisphericLight");
        const { DirectionalLight } = await import("@babylonjs/core/Lights/directionalLight");
        const { SceneLoader } = await import("@babylonjs/core/Loading/sceneLoader");
        const { Color3, Color4 } = await import("@babylonjs/core/Maths/math.color");

        //Engine & Scene 
        const engine = new Engine(canvasRef.current, true, {
          preserveDrawingBuffer: true,
          stencil: true,
        });
        const scene = new Scene(engine);

        //bg colour
        scene.clearColor = new Color4(0.2, 0.2, 0.25, 1.0);

        //Camera setup
        const camera = new ArcRotateCamera(
          "camera",
          -Math.PI / 2,
          Math.PI / 2.5,
          5,
          Vector3.Zero(),
          scene
        );
        camera.attachControl(canvasRef.current, true);
        camera.lowerRadiusLimit = 2;
        camera.upperRadiusLimit = 20;
        camera.wheelPrecision = 50;

        //Lighting
        const hemisphericLight = new HemisphericLight(
          "hemisphericLight",
          new Vector3(0, 1, 0),
          scene
        );
        hemisphericLight.intensity = 0.7;
        hemisphericLight.groundColor = new Color3(0.2, 0.2, 0.3);

        const directionalLight = new DirectionalLight(
          "directionalLight",
          new Vector3(-1, -2, -1),
          scene
        );
        directionalLight.position = new Vector3(20, 40, 20);
        directionalLight.intensity = 0.5;

        //Load 3D model
        SceneLoader.ImportMesh(
          "",
          "",
          modelUrl,
          scene,
          (meshes) => {
            console.log("Model loaded:", meshes.length, "meshes");
            if (meshes.length > 0) {
              const rootMesh = meshes[0];
              camera.setTarget(rootMesh.position);
              
              camera.setPosition(new Vector3(0, 2, -5));
            }
          },
          undefined,
          (scene, message) => {
            console.error("Error loading model:", message);
          }
        );

        //Resize
        const handleResize = () => engine.resize();
        window.addEventListener("resize", handleResize);

        //Render
        engine.runRenderLoop(() => scene.render());

        // Cleanup
        return () => {
          window.removeEventListener("resize", handleResize);
          scene.dispose();
          engine.dispose();
        };
      } catch (error) {
        console.error("Error initializing Babylon.js:", error);
      }
    };

    const cleanup = initViewer();
    
    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, [modelUrl]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "400px",
        outline: "none",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
      }}
    />
  );
}