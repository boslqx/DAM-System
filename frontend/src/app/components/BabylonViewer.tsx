"use client";
import { useEffect, useRef } from "react";
import "@babylonjs/loaders";

export default function BabylonViewer({ modelUrl }: { modelUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !modelUrl) return;

    const initViewer = async () => {
      try {
        // Dynamic imports
        const { Engine } = await import("@babylonjs/core/Engines/engine");
        const { Scene } = await import("@babylonjs/core/scene");
        const { ArcRotateCamera } = await import("@babylonjs/core/Cameras/arcRotateCamera");
        const { Vector3 } = await import("@babylonjs/core/Maths/math.vector");
        const { HemisphericLight } = await import("@babylonjs/core/Lights/hemisphericLight");
        const { SceneLoader } = await import("@babylonjs/core/Loading/sceneLoader");
        const { CubeTexture } = await import("@babylonjs/core/Materials/Textures/cubeTexture");
        const { EnvironmentHelper } = await import("@babylonjs/core/Helpers/environmentHelper");

        // ✅ Create engine and scene
        const engine = new Engine(canvasRef.current, true);
        const scene = new Scene(engine);

        // ✅ Add realistic environment and skybox
        const envTexture = CubeTexture.CreateFromPrefilteredData(
          "https://assets.babylonjs.com/environments/environmentSpecular.env",
          scene
        );
        scene.environmentTexture = envTexture;

        // ✅ Proper modern way to add a skybox in Babylon v8+
        new EnvironmentHelper(
          {
            createSkybox: true,
            skyboxSize: 1000,
            environmentTexture: envTexture,
          },
          scene
        );

        // Camera setup
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

        // Light
        const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
        light.intensity = 0.7;

        // Load 3D model
        SceneLoader.ImportMesh(
          "",
          "",
          modelUrl,
          scene,
          (meshes) => {
            console.log("✅ Model loaded:", meshes.length, "meshes");
            if (meshes.length > 0) {
              const rootMesh = meshes[0];
              camera.setTarget(rootMesh.position);
            }
          },
          undefined,
          (scene, message) => {
            console.error("❌ Error loading model:", message);
          }
        );

        // Resize handler
        const handleResize = () => engine.resize();
        window.addEventListener("resize", handleResize);

        // Render loop
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
        borderRadius: "8px",
      }}
    />
  );
}