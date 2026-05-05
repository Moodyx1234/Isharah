import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import { GESTURES, type Gesture } from "@/lib/sign-language/gestures";

interface AvatarProps {
  currentGesture: string;
  isActive: boolean;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function HumanoidAvatar({ currentGesture, isActive }: AvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftForearmRef = useRef<THREE.Group>(null);
  const rightForearmRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);

  const targetGesture = useMemo(
    () => GESTURES[currentGesture] || GESTURES.neutral,
    [currentGesture]
  );

  const currentAngles = useRef({
    leftArm: 0,
    rightArm: 0,
    leftForearm: 0,
    rightForearm: 0,
    torso: 0,
    headNod: 0,
  });

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const dt = 0.05;

    const breathe = Math.sin(t * 1.5) * 0.008;

    const ca = currentAngles.current;
    ca.leftArm = lerp(ca.leftArm, targetGesture.leftArmAngle, dt);
    ca.rightArm = lerp(ca.rightArm, targetGesture.rightArmAngle, dt);
    ca.leftForearm = lerp(ca.leftForearm, targetGesture.leftForearmAngle, dt);
    ca.rightForearm = lerp(ca.rightForearm, targetGesture.rightForearmAngle, dt);
    ca.torso = lerp(ca.torso, targetGesture.torsoTilt, dt);
    ca.headNod = lerp(ca.headNod, targetGesture.headNod, dt);

    if (leftArmRef.current) {
      leftArmRef.current.rotation.z = -ca.leftArm + breathe;
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.z = ca.rightArm + breathe;
    }
    if (leftForearmRef.current) {
      leftForearmRef.current.rotation.z = -ca.leftForearm;
    }
    if (rightForearmRef.current) {
      rightForearmRef.current.rotation.z = ca.rightForearm;
    }
    if (torsoRef.current) {
      torsoRef.current.rotation.z = ca.torso;
    }
    if (headRef.current) {
      headRef.current.rotation.x = ca.headNod;
      headRef.current.rotation.y = Math.sin(t * 0.4) * 0.04;
    }
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 0.8) * 0.01;
    }
  });

  const skinColor = "#E8C9A0";
  const hairColor = "#2C1810";
  const shirtColor = "#0F3D3E";
  const eyeColor = "#1a1a2e";

  return (
    <group ref={groupRef} position={[0, -1.2, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} scale={[1, 0.6, 1]} receiveShadow>
        <circleGeometry args={[0.4, 32]} />
        <meshBasicMaterial color="#000000" opacity={0.12} transparent />
      </mesh>

      <group ref={torsoRef} position={[0, 0.8, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.22, 0.18, 0.7, 16]} />
          <meshStandardMaterial color={shirtColor} roughness={0.8} />
        </mesh>

        <mesh position={[0, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.09, 0.14, 12]} />
          <meshStandardMaterial color={skinColor} roughness={0.7} />
        </mesh>

        <group ref={headRef} position={[0, 0.6, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.2, 24, 24]} />
            <meshStandardMaterial color={skinColor} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.11, -0.02]} castShadow>
            <sphereGeometry args={[0.195, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial color={hairColor} roughness={0.9} />
          </mesh>
          <mesh position={[-0.07, 0.02, 0.18]}>
            <sphereGeometry args={[0.025, 12, 12]} />
            <meshStandardMaterial color={eyeColor} />
          </mesh>
          <mesh position={[0.07, 0.02, 0.18]}>
            <sphereGeometry args={[0.025, 12, 12]} />
            <meshStandardMaterial color={eyeColor} />
          </mesh>
          <mesh position={[-0.07, 0.02, 0.178]}>
            <sphereGeometry args={[0.032, 12, 12]} />
            <meshStandardMaterial color="white" />
          </mesh>
          <mesh position={[0.07, 0.02, 0.178]}>
            <sphereGeometry args={[0.032, 12, 12]} />
            <meshStandardMaterial color="white" />
          </mesh>
          <mesh position={[0, -0.04, 0.195]}>
            <sphereGeometry args={[0.018, 8, 8]} />
            <meshStandardMaterial color={skinColor} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.1, 0.185]}>
            <sphereGeometry args={[0.04, 8, 4, 0, Math.PI]} />
            <meshStandardMaterial color="#c0706a" roughness={0.8} />
          </mesh>
        </group>

        <group position={[-0.26, 0.25, 0]}>
          <group ref={leftArmRef}>
            <mesh position={[0, -0.14, 0]} castShadow>
              <cylinderGeometry args={[0.055, 0.05, 0.28, 10]} />
              <meshStandardMaterial color={shirtColor} roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.28, 0]}>
              <sphereGeometry args={[0.055, 10, 10]} />
              <meshStandardMaterial color={skinColor} roughness={0.7} />
            </mesh>
            <group position={[0, -0.28, 0]} ref={leftForearmRef}>
              <mesh position={[0, -0.12, 0]} castShadow>
                <cylinderGeometry args={[0.045, 0.04, 0.24, 10]} />
                <meshStandardMaterial color={skinColor} roughness={0.7} />
              </mesh>
              <mesh position={[0, -0.26, 0]} castShadow>
                <boxGeometry args={[0.08, 0.1, 0.04]} />
                <meshStandardMaterial color={skinColor} roughness={0.7} />
              </mesh>
            </group>
          </group>
        </group>

        <group position={[0.26, 0.25, 0]}>
          <group ref={rightArmRef}>
            <mesh position={[0, -0.14, 0]} castShadow>
              <cylinderGeometry args={[0.055, 0.05, 0.28, 10]} />
              <meshStandardMaterial color={shirtColor} roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.28, 0]}>
              <sphereGeometry args={[0.055, 10, 10]} />
              <meshStandardMaterial color={skinColor} roughness={0.7} />
            </mesh>
            <group position={[0, -0.28, 0]} ref={rightForearmRef}>
              <mesh position={[0, -0.12, 0]} castShadow>
                <cylinderGeometry args={[0.045, 0.04, 0.24, 10]} />
                <meshStandardMaterial color={skinColor} roughness={0.7} />
              </mesh>
              <mesh position={[0, -0.26, 0]} castShadow>
                <boxGeometry args={[0.08, 0.1, 0.04]} />
                <meshStandardMaterial color={skinColor} roughness={0.7} />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.17, 0.2, 16]} />
        <meshStandardMaterial color="#1a2e6e" roughness={0.9} />
      </mesh>

      <group position={[-0.1, 0.15, 0]}>
        <mesh position={[0, -0.18, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.065, 0.36, 10]} />
          <meshStandardMaterial color="#1a2e6e" roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.38, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.055, 0.3, 10]} />
          <meshStandardMaterial color={skinColor} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.55, 0.03]} castShadow>
          <boxGeometry args={[0.1, 0.06, 0.18]} />
          <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
        </mesh>
      </group>

      <group position={[0.1, 0.15, 0]}>
        <mesh position={[0, -0.18, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.065, 0.36, 10]} />
          <meshStandardMaterial color="#1a2e6e" roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.38, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.055, 0.3, 10]} />
          <meshStandardMaterial color={skinColor} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.55, 0.03]} castShadow>
          <boxGeometry args={[0.1, 0.06, 0.18]} />
          <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

interface SignAvatarProps {
  currentGesture?: string;
  isActive?: boolean;
  label?: string;
}

export function SignAvatar({ currentGesture = "neutral", isActive = false, label }: SignAvatarProps) {
  return (
    <div
      className="avatar-container w-full h-full rounded-2xl overflow-hidden relative"
      role="img"
      aria-label={label || "Sign language avatar"}
    >
      <Canvas
        camera={{ position: [0, 0.5, 3.5], fov: 40 }}
        shadows
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[2, 4, 3]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-2, 2, -1]} intensity={0.4} />
        <pointLight position={[0, 2, 2]} intensity={0.3} color="#e8985e" />

        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -2.2, 0]}
          receiveShadow
        >
          <circleGeometry args={[3, 32]} />
          <meshStandardMaterial color="#0a2b2c" roughness={1} />
        </mesh>

        <HumanoidAvatar currentGesture={currentGesture} isActive={isActive} />

        <Environment preset="studio" />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={Math.PI / 4}
          target={[0, 0, 0]}
        />
      </Canvas>

      {currentGesture !== "neutral" && GESTURES[currentGesture] && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm rounded-full px-4 py-1.5 backdrop-blur-sm">
          {GESTURES[currentGesture].nameAr}
        </div>
      )}

      {isActive && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
          </span>
          <span className="text-white text-xs font-medium">LIVE</span>
        </div>
      )}
    </div>
  );
}
