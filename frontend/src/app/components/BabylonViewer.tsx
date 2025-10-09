"use client";
import { useEffect, useRef } from "react";

export default function BabylonViewer({ modelUrl }: { modelUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !modelUrl) return;

    const initViewer = async () => {
      try {
        // Import dynamically to avoid SSR issues
        const { Engine } = await import("@babylonjs/core/Engines/engine");
        const { Scene } = await import("@babylonjs/core/scene");
        const { ArcRotateCamera } = await import("@babylonjs/core/Cameras/arcRotateCamera");
        const { Vector3 } = await import("@babylonjs/core/Maths/math.vector");
        const { HemisphericLight } = await import("@babylonjs/core/Lights/hemisphericLight");
        const { SceneLoader } = await import("@babylonjs/core/Loading/sceneLoader");

        // Create engine and scene
        const engine = new Engine(canvasRef.current, true);
        const scene = new Scene(engine);

        // Create camera - fixed parameters
        const camera = new ArcRotateCamera(
          "camera",
          -Math.PI / 2,
          Math.PI / 2.5,
          5, // Increased distance
          Vector3.Zero(),
          scene
        );
        
        // ✅ FIXED: Use attachControl (singular)
        camera.attachControl(canvasRef.current, true);
        camera.lowerRadiusLimit = 2;
        camera.upperRadiusLimit = 20;

        // Create light
        const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
        light.intensity = 0.7;

        // Load the 3D model
        SceneLoader.ImportMesh(
          "",
          "",
          modelUrl,
          scene,
          (meshes) => {
            console.log("Model loaded successfully:", meshes.length, "meshes");
            
            // Center the model in view
            if (meshes.length > 0) {
              const rootMesh = meshes[0];
              camera.setTarget(rootMesh.position);
            }
          },
          null,
          (scene, message) => {
            console.error("Error loading model:", message);
          }
        );

        // Handle window resize
        const handleResize = () => {
          engine.resize();
        };

        window.addEventListener("resize", handleResize);

        // Render loop
        engine.runRenderLoop(() => {
          scene.render();
        });

        // Cleanup function
        return () => {
          window.removeEventListener("resize", handleResize);
          scene.dispose();
          engine.dispose();
        };
      } catch (error) {
        console.error("Error initializing Babylon.js:", error);
      }
    };

    initViewer();
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
        borderRadius: "8px"
      }}
    />
  );
}