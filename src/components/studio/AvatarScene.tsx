import { Suspense, useEffect, useLayoutEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useAnimations, useGLTF } from "@react-three/drei";
import { Box3, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";

export type AvatarSceneProps = {
  url: string;
  clip: string;
  speed: number;
  stage: "quente" | "frio" | "noite";
  tint: string;
  recolor: boolean;
  turn: number;
};

export function AvatarScene({ url, clip, speed, stage, tint, recolor, turn }: AvatarSceneProps) {
  return (
    <div className="h-96 w-full overflow-hidden rounded-2xl border border-line bg-bg sm:h-stage">
      <Canvas shadows dpr={[1, 1.6]} camera={{ position: [0, 1.25, 3.35], fov: 34 }} gl={{ antialias: true }}>
        <color attach="background" args={["#14120f"]} />
        <Suspense fallback={null}>
          <Rig url={url} clip={clip} speed={speed} tint={tint} recolor={recolor} turn={turn} />
        </Suspense>
        <Lights stage={stage} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[1.7, 48]} />
          <meshStandardMaterial color="#221f1a" roughness={1} />
        </mesh>
        <OrbitControls
          target={[0, 0.95, 0]}
          enablePan={false}
          minDistance={1.8}
          maxDistance={6}
          maxPolarAngle={Math.PI / 2.05}
        />
      </Canvas>
    </div>
  );
}

function Rig({
  url,
  clip,
  speed,
  tint,
  recolor,
  turn,
}: Omit<AvatarSceneProps, "stage">) {
  const gltf = useGLTF(url);
  const scene = useMemo(() => cloneSkeleton(gltf.scene), [gltf.scene]);
  const { actions } = useAnimations(gltf.animations, scene);

  useLayoutEffect(() => {
    scene.scale.set(1, 1, 1);
    scene.position.set(0, 0, 0);
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    if (size.y > 0) {
      scene.scale.setScalar(1.72 / size.y);
      const grounded = new Box3().setFromObject(scene);
      scene.position.y -= grounded.min.y;
    }
    scene.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const material = mesh.material as MeshStandardMaterial;
      if (!material?.color) return;
      material.color.set(recolor ? tint : "#ffffff");
    });
  }, [scene, recolor, tint]);

  useEffect(() => {
    const names = Object.keys(actions);
    const name = actions[clip] ? clip : names[0];
    const action = name ? actions[name] : undefined;
    if (!action) return;
    action.reset().fadeIn(0.25).play();
    action.timeScale = speed;
    return () => {
      action.fadeOut(0.2);
    };
  }, [actions, clip, speed]);

  return <primitive object={scene} rotation={[0, turn, 0]} />;
}

function Lights({ stage }: { stage: AvatarSceneProps["stage"] }) {
  const key = stage === "frio" ? "#d7e6ff" : stage === "noite" ? "#e2a15a" : "#ffd7ad";
  const fill = stage === "noite" ? "#31425c" : "#9eb0c0";
  return (
    <>
      <ambientLight intensity={stage === "noite" ? 0.32 : 0.58} />
      <directionalLight
        position={[2.5, 4.4, 2.4]}
        intensity={stage === "noite" ? 2.8 : 3.8}
        color={key}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-2.4, 2.4, -1.2]} intensity={1.35} color={fill} />
    </>
  );
}

useGLTF.preload("/models/michelle.glb");
useGLTF.preload("/models/xbot.glb");
