import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import { GESTURES, HP, type HandPose, type GestureKeyframe } from "@/lib/sign-language/gestures";

// ─── Geometry config ─────────────────────────────────────────────────────────

const FINGER_CONFIG = [
  { x: -0.030, y:  0.015, segs: [[0.038, 0.013], [0.028, 0.012], [0.022, 0.010]] as const },
  { x: -0.022, y:  0.000, segs: [[0.050, 0.011], [0.038, 0.010], [0.028, 0.009]] as const },
  { x: -0.005, y: -0.004, segs: [[0.054, 0.011], [0.040, 0.010], [0.030, 0.009]] as const },
  { x:  0.012, y:  0.000, segs: [[0.048, 0.010], [0.035, 0.009], [0.025, 0.008]] as const },
  { x:  0.027, y:  0.006, segs: [[0.036, 0.009], [0.026, 0.008], [0.020, 0.007]] as const },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function lerpHandPose(a: HandPose, b: HandPose, t: number): HandPose {
  return a.map((v, i) => lerp(v, b[i], t)) as unknown as HandPose;
}

// ─── Pose snapshot ───────────────────────────────────────────────────────────

interface PoseSnapshot {
  leftArmAngle: number;
  rightArmAngle: number;
  leftForearmAngle: number;
  rightForearmAngle: number;
  torsoTilt: number;
  headNod: number;
  headShake: number;
  leftHand: HandPose;
  rightHand: HandPose;
  expression: string;
}

function kfToSnapshot(kf: GestureKeyframe): PoseSnapshot {
  return {
    leftArmAngle:     kf.la  ?? 0,
    rightArmAngle:    kf.ra  ?? 0,
    leftForearmAngle: kf.lfa ?? 0,
    rightForearmAngle:kf.rfa ?? 0,
    torsoTilt:        kf.tt  ?? 0,
    headNod:          kf.hn  ?? 0,
    headShake:        kf.hs  ?? 0,
    leftHand:  HP[kf.lh ?? "OPEN"] ?? HP.OPEN,
    rightHand: HP[kf.rh ?? "OPEN"] ?? HP.OPEN,
    expression: kf.ex ?? "neutral",
  };
}

function interpolateKeyframePose(keyframes: GestureKeyframe[], progress: number): PoseSnapshot {
  const p = Math.max(0, Math.min(1, progress));
  let loIdx = 0;
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (p >= keyframes[i].t) loIdx = i;
  }
  const hiIdx = Math.min(loIdx + 1, keyframes.length - 1);
  const lo = keyframes[loIdx];
  const hi = keyframes[hiIdx];
  const span = hi.t - lo.t;
  const local = span > 0.001 ? easeInOut((p - lo.t) / span) : (p >= hi.t ? 1 : 0);

  const loSnap = kfToSnapshot(lo);
  const hiSnap = kfToSnapshot(hi);

  return {
    leftArmAngle:     lerp(loSnap.leftArmAngle,     hiSnap.leftArmAngle,     local),
    rightArmAngle:    lerp(loSnap.rightArmAngle,     hiSnap.rightArmAngle,    local),
    leftForearmAngle: lerp(loSnap.leftForearmAngle,  hiSnap.leftForearmAngle, local),
    rightForearmAngle:lerp(loSnap.rightForearmAngle, hiSnap.rightForearmAngle,local),
    torsoTilt:        lerp(loSnap.torsoTilt,         hiSnap.torsoTilt,        local),
    headNod:          lerp(loSnap.headNod,           hiSnap.headNod,          local),
    headShake:        lerp(loSnap.headShake,         hiSnap.headShake,        local),
    leftHand:  lerpHandPose(loSnap.leftHand,  hiSnap.leftHand,  local),
    rightHand: lerpHandPose(loSnap.rightHand, hiSnap.rightHand, local),
    expression: local < 0.5 ? loSnap.expression : hiSnap.expression,
  };
}

// ─── Expression targets ───────────────────────────────────────────────────────

const EXPR_TARGETS: Record<string, { raise: number; furrow: number; smile: number }> = {
  neutral:  { raise: 0,    furrow: 0,    smile: 0    },
  smile:    { raise: 0.06, furrow: 0,    smile: 0.38 },
  question: { raise: 0.20, furrow: 0,    smile: 0    },
  emphasis: { raise: 0,    furrow: 0.24, smile: 0    },
  grateful: { raise: 0.10, furrow: 0,    smile: 0.22 },
};

// ─── Colors ───────────────────────────────────────────────────────────────────

const SKIN  = "#E8C9A0";
const SHIRT = "#0D3448";
const PANTS = "#1A2D5A";
const SHOES = "#12121E";
const HAIR  = "#2C1810";

// ─── HandMesh (declared outside HumanoidAvatar to prevent ref reset) ─────────

interface HandMeshProps {
  h: 0 | 1;
  fjSet: (((el: THREE.Group | null) => void))[][][];
}

function HandMesh({ h, fjSet }: HandMeshProps) {
  const m = h === 0 ? -1 : 1;
  return (
    <group>
      <mesh position={[0, -0.036, 0]} castShadow>
        <boxGeometry args={[0.082, 0.074, 0.042]} />
        <meshStandardMaterial color={SKIN} roughness={0.65} />
      </mesh>
      {FINGER_CONFIG.map((fc, fi) => (
        <group key={fi} position={[fc.x * m, fc.y - 0.074, 0.010]}>
          <group ref={fjSet[h][fi][0]}>
            <mesh position={[0, -fc.segs[0][0] / 2, 0]} castShadow>
              <cylinderGeometry args={[fc.segs[0][1] * 0.88, fc.segs[0][1], fc.segs[0][0], 7, 1]} />
              <meshStandardMaterial color={SKIN} roughness={0.65} />
            </mesh>
            <group position={[0, -fc.segs[0][0], 0]}>
              <group ref={fjSet[h][fi][1]}>
                <mesh position={[0, -fc.segs[1][0] / 2, 0]} castShadow>
                  <cylinderGeometry args={[fc.segs[1][1] * 0.88, fc.segs[1][1], fc.segs[1][0], 7, 1]} />
                  <meshStandardMaterial color={SKIN} roughness={0.65} />
                </mesh>
                <group position={[0, -fc.segs[1][0], 0]}>
                  <group ref={fjSet[h][fi][2]}>
                    <mesh position={[0, -fc.segs[2][0] / 2, 0]} castShadow>
                      <cylinderGeometry args={[fc.segs[2][1] * 0.85, fc.segs[2][1], fc.segs[2][0], 7, 1]} />
                      <meshStandardMaterial color={SKIN} roughness={0.65} />
                    </mesh>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      ))}
    </group>
  );
}

// ─── HumanoidAvatar ───────────────────────────────────────────────────────────

interface AvatarProps {
  currentGesture: string;
  isActive: boolean;
  speed: number;
}

function HumanoidAvatar({ currentGesture, isActive: _isActive, speed }: AvatarProps) {
  const groupRef     = useRef<THREE.Group>(null);
  const torsoRef     = useRef<THREE.Group>(null);
  const headRef      = useRef<THREE.Group>(null);
  const leftArmRef   = useRef<THREE.Group>(null);
  const rightArmRef  = useRef<THREE.Group>(null);
  const leftForeRef  = useRef<THREE.Group>(null);
  const rightForeRef = useRef<THREE.Group>(null);

  // Expression / face refs
  const leftBrowRef      = useRef<THREE.Mesh>(null);
  const rightBrowRef     = useRef<THREE.Mesh>(null);
  const mouthRef         = useRef<THREE.Mesh>(null);
  const leftEyeGroupRef  = useRef<THREE.Group>(null);
  const rightEyeGroupRef = useRef<THREE.Group>(null);

  // 30 finger joint refs: [hand][finger][joint]
  const fj = useRef<(THREE.Group | null)[][][]>([
    [[null,null,null],[null,null,null],[null,null,null],[null,null,null],[null,null,null]],
    [[null,null,null],[null,null,null],[null,null,null],[null,null,null],[null,null,null]],
  ]);

  const fjSet = useMemo(() =>
    Array.from({ length: 2 }, (_, h) =>
      Array.from({ length: 5 }, (_, f) =>
        Array.from({ length: 3 }, (_, j) =>
          (el: THREE.Group | null) => { fj.current[h][f][j] = el; }
        )
      )
    )
  , []);

  // Gesture keyframe timing
  const gestureState = useRef({ id: currentGesture, startMs: 0 });

  // Current interpolated limb angles (used for smooth transitions)
  const ca = useRef({ leftArm: 0, rightArm: 0, leftFore: 0, rightFore: 0, torso: 0, headNod: 0, headShake: 0 });

  // Current expression values
  const exCurrent = useRef({ raise: 0, furrow: 0, smile: 0 });

  // Blink state
  const blinkState = useRef({ nextBlink: 2 + Math.random() * 2, phase: 0, prog: 0 });

  // Finger pose buffers (for smooth transitions)
  const fingerPoses = useRef<[HandPose, HandPose]>([HP.OPEN, HP.OPEN]);

  useFrame((state, delta) => {
    const t   = state.clock.elapsedTime;
    const nowMs = t * 1000;

    // Detect gesture change
    if (gestureState.current.id !== currentGesture) {
      gestureState.current = { id: currentGesture, startMs: nowMs };
    }

    const g = GESTURES[currentGesture] ?? GESTURES.neutral;
    const elapsed  = nowMs - gestureState.current.startMs;
    const progress = Math.min(1, elapsed / Math.max(g.durationMs, 1));

    // Compute target pose snapshot
    let snap: PoseSnapshot;
    if (g.keyframes && g.keyframes.length >= 2) {
      snap = interpolateKeyframePose(g.keyframes, progress);
    } else {
      snap = {
        leftArmAngle:     g.leftArmAngle,
        rightArmAngle:    g.rightArmAngle,
        leftForearmAngle: g.leftForearmAngle,
        rightForearmAngle:g.rightForearmAngle,
        torsoTilt:        g.torsoTilt,
        headNod:          g.headNod,
        headShake:        g.headShake ?? 0,
        leftHand:  g.leftHand  ?? HP.OPEN,
        rightHand: g.rightHand ?? HP.OPEN,
        expression: "neutral",
      };
    }

    // Lerp factor — slightly responsive for keyframe gestures
    const lf = Math.max(0.02, Math.min(0.20, (g.keyframes ? 0.14 : 0.06) * speed));
    const ff = lf * 1.5;
    const breathe = Math.sin(t * 1.4) * 0.006;

    ca.current.leftArm   = lerp(ca.current.leftArm,   snap.leftArmAngle,     lf);
    ca.current.rightArm  = lerp(ca.current.rightArm,  snap.rightArmAngle,    lf);
    ca.current.leftFore  = lerp(ca.current.leftFore,  snap.leftForearmAngle, lf);
    ca.current.rightFore = lerp(ca.current.rightFore, snap.rightForearmAngle,lf);
    ca.current.torso     = lerp(ca.current.torso,     snap.torsoTilt,        lf);
    ca.current.headNod   = lerp(ca.current.headNod,   snap.headNod,          lf);
    ca.current.headShake = lerp(ca.current.headShake, snap.headShake,        lf);

    if (leftArmRef.current)   leftArmRef.current.rotation.z   = -ca.current.leftArm  + breathe;
    if (rightArmRef.current)  rightArmRef.current.rotation.z  =  ca.current.rightArm + breathe;
    if (leftForeRef.current)  leftForeRef.current.rotation.z  = -ca.current.leftFore;
    if (rightForeRef.current) rightForeRef.current.rotation.z =  ca.current.rightFore;
    if (torsoRef.current)     torsoRef.current.rotation.z     =  ca.current.torso;
    if (headRef.current) {
      headRef.current.rotation.x = ca.current.headNod;
      headRef.current.rotation.y = ca.current.headShake + Math.sin(t * 0.33) * 0.020;
    }
    if (groupRef.current) groupRef.current.position.y = Math.sin(t * 0.75) * 0.007 - 0.55;

    // Animate finger joints
    fingerPoses.current[0] = lerpHandPose(fingerPoses.current[0], snap.leftHand,  ff);
    fingerPoses.current[1] = lerpHandPose(fingerPoses.current[1], snap.rightHand, ff);
    for (let h = 0; h < 2; h++) {
      const pose = fingerPoses.current[h];
      for (let fi = 0; fi < 5; fi++) {
        for (let ji = 0; ji < 3; ji++) {
          const ref = fj.current[h][fi][ji];
          if (ref) ref.rotation.x = pose[fi * 3 + ji];
        }
        const proxRef = fj.current[h][fi][0];
        if (fi === 0 && proxRef) {
          const spread = 1 - Math.min(pose[0] / 1.2, 1);
          const abduction = spread * 0.38 - 0.05;
          proxRef.rotation.z = lerp(proxRef.rotation.z, abduction * (h === 0 ? 1 : -1), ff);
        }
      }
    }

    // Expression lerp
    const exTarget = EXPR_TARGETS[snap.expression] ?? EXPR_TARGETS.neutral;
    const ef = Math.min(0.08, 0.04 * speed);
    exCurrent.current.raise  = lerp(exCurrent.current.raise,  exTarget.raise,  ef);
    exCurrent.current.furrow = lerp(exCurrent.current.furrow, exTarget.furrow, ef);
    exCurrent.current.smile  = lerp(exCurrent.current.smile,  exTarget.smile,  ef);

    if (leftBrowRef.current) {
      leftBrowRef.current.position.y    =  0.068 + exCurrent.current.raise * 0.018;
      leftBrowRef.current.rotation.z    =  0.16  + exCurrent.current.furrow * 0.28;
    }
    if (rightBrowRef.current) {
      rightBrowRef.current.position.y   =  0.068 + exCurrent.current.raise * 0.018;
      rightBrowRef.current.rotation.z   = -0.16  - exCurrent.current.furrow * 0.28;
    }
    if (mouthRef.current) {
      mouthRef.current.scale.x          = 1 + exCurrent.current.smile * 0.40;
      mouthRef.current.position.y       = -0.094 - exCurrent.current.smile * 0.005;
    }

    // Blink system
    const bs = blinkState.current;
    bs.nextBlink -= delta;
    if (bs.phase === 0 && bs.nextBlink <= 0) {
      bs.phase = 1;
      bs.prog  = 0;
      bs.nextBlink = 2.5 + Math.random() * 3.5;
    }
    if (bs.phase === 1) {
      bs.prog += delta * 9;
      if (bs.prog >= 1) { bs.prog = 1; bs.phase = 2; }
    } else if (bs.phase === 2) {
      bs.prog -= delta * 5;
      if (bs.prog <= 0) { bs.prog = 0; bs.phase = 0; }
    }
    const eyeScaleY = bs.phase > 0 ? Math.max(0.08, 1 - bs.prog * 0.93) : 1;
    if (leftEyeGroupRef.current)  leftEyeGroupRef.current.scale.y  = eyeScaleY;
    if (rightEyeGroupRef.current) rightEyeGroupRef.current.scale.y = eyeScaleY;
  });

  return (
    <group ref={groupRef} position={[0, -0.55, 0]}>
      {/* Ground shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.44, 0]} scale={[0.90, 0.55, 1]}>
        <circleGeometry args={[0.38, 28]} />
        <meshBasicMaterial color="#000000" opacity={0.09} transparent />
      </mesh>

      {/* ── Torso ── */}
      <group ref={torsoRef} position={[0, 0.80, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.220, 0.180, 0.70, 16]} />
          <meshStandardMaterial color={SHIRT} roughness={0.80} />
        </mesh>

        {/* Neck */}
        <mesh position={[0, 0.40, 0]} castShadow>
          <cylinderGeometry args={[0.072, 0.088, 0.14, 12]} />
          <meshStandardMaterial color={SKIN} roughness={0.65} />
        </mesh>

        {/* ── Head ── */}
        <group ref={headRef} position={[0, 0.60, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.200, 28, 22]} />
            <meshStandardMaterial color={SKIN} roughness={0.62} />
          </mesh>

          {/* Hair cap */}
          <mesh position={[0, 0.10, -0.018]} castShadow>
            <sphereGeometry args={[0.198, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
            <meshStandardMaterial color={HAIR} roughness={0.95} />
          </mesh>

          {/* Eyebrows — refs for expression system */}
          <mesh ref={leftBrowRef}  position={[-0.068, 0.068, 0.183]} rotation={[0, 0,  0.16]}>
            <boxGeometry args={[0.046, 0.008, 0.004]} />
            <meshStandardMaterial color={HAIR} roughness={0.95} />
          </mesh>
          <mesh ref={rightBrowRef} position={[ 0.068, 0.068, 0.183]} rotation={[0, 0, -0.16]}>
            <boxGeometry args={[0.046, 0.008, 0.004]} />
            <meshStandardMaterial color={HAIR} roughness={0.95} />
          </mesh>

          {/* Left eye group — blink via scale.y */}
          <group ref={leftEyeGroupRef} position={[-0.068, 0.020, 0]}>
            <mesh position={[0, 0, 0.176]}>
              <sphereGeometry args={[0.030, 14, 12]} />
              <meshStandardMaterial color="#f6f6ff" roughness={0.25} />
            </mesh>
            <mesh position={[0, -0.002, 0.198]}>
              <sphereGeometry args={[0.017, 10, 10]} />
              <meshStandardMaterial color="#1a1a30" roughness={0.20} metalness={0.1} />
            </mesh>
            <mesh position={[0.008, 0.006, 0.204]}>
              <sphereGeometry args={[0.005, 6, 6]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>

          {/* Right eye group */}
          <group ref={rightEyeGroupRef} position={[0.068, 0.020, 0]}>
            <mesh position={[0, 0, 0.176]}>
              <sphereGeometry args={[0.030, 14, 12]} />
              <meshStandardMaterial color="#f6f6ff" roughness={0.25} />
            </mesh>
            <mesh position={[0, -0.002, 0.198]}>
              <sphereGeometry args={[0.017, 10, 10]} />
              <meshStandardMaterial color="#1a1a30" roughness={0.20} metalness={0.1} />
            </mesh>
            <mesh position={[-0.008, 0.006, 0.204]}>
              <sphereGeometry args={[0.005, 6, 6]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>

          {/* Nose */}
          <mesh position={[0, -0.038, 0.196]}>
            <sphereGeometry args={[0.017, 8, 8]} />
            <meshStandardMaterial color={SKIN} roughness={0.65} />
          </mesh>

          {/* Mouth */}
          <mesh ref={mouthRef} position={[0, -0.094, 0.184]}>
            <sphereGeometry args={[0.036, 8, 4, 0, Math.PI]} />
            <meshStandardMaterial color="#c07070" roughness={0.80} />
          </mesh>
        </group>

        {/* ── Left arm ── */}
        <group position={[-0.26, 0.25, 0]}>
          <group ref={leftArmRef}>
            <mesh position={[0, -0.14, 0]} castShadow>
              <cylinderGeometry args={[0.050, 0.045, 0.28, 10]} />
              <meshStandardMaterial color={SHIRT} roughness={0.80} />
            </mesh>
            <mesh position={[0, -0.28, 0]}>
              <sphereGeometry args={[0.050, 10, 10]} />
              <meshStandardMaterial color={SKIN} roughness={0.65} />
            </mesh>
            <group position={[0, -0.28, 0]} ref={leftForeRef}>
              <mesh position={[0, -0.12, 0]} castShadow>
                <cylinderGeometry args={[0.040, 0.036, 0.24, 10]} />
                <meshStandardMaterial color={SKIN} roughness={0.65} />
              </mesh>
              <group position={[0, -0.26, 0]}>
                <HandMesh h={0} fjSet={fjSet} />
              </group>
            </group>
          </group>
        </group>

        {/* ── Right arm ── */}
        <group position={[0.26, 0.25, 0]}>
          <group ref={rightArmRef}>
            <mesh position={[0, -0.14, 0]} castShadow>
              <cylinderGeometry args={[0.050, 0.045, 0.28, 10]} />
              <meshStandardMaterial color={SHIRT} roughness={0.80} />
            </mesh>
            <mesh position={[0, -0.28, 0]}>
              <sphereGeometry args={[0.050, 10, 10]} />
              <meshStandardMaterial color={SKIN} roughness={0.65} />
            </mesh>
            <group position={[0, -0.28, 0]} ref={rightForeRef}>
              <mesh position={[0, -0.12, 0]} castShadow>
                <cylinderGeometry args={[0.040, 0.036, 0.24, 10]} />
                <meshStandardMaterial color={SKIN} roughness={0.65} />
              </mesh>
              <group position={[0, -0.26, 0]}>
                <HandMesh h={1} fjSet={fjSet} />
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* ── Hips ── */}
      <mesh position={[0, 0.30, 0]} castShadow>
        <cylinderGeometry args={[0.190, 0.175, 0.20, 16]} />
        <meshStandardMaterial color={PANTS} roughness={0.90} />
      </mesh>

      {/* ── Left leg ── */}
      <group position={[-0.10, 0.15, 0]}>
        <mesh position={[0, -0.18, 0]} castShadow>
          <cylinderGeometry args={[0.068, 0.062, 0.36, 10]} />
          <meshStandardMaterial color={PANTS} roughness={0.90} />
        </mesh>
        <mesh position={[0, -0.38, 0]} castShadow>
          <cylinderGeometry args={[0.056, 0.050, 0.30, 10]} />
          <meshStandardMaterial color={SKIN} roughness={0.65} />
        </mesh>
        <mesh position={[0, -0.548, 0.028]} castShadow>
          <boxGeometry args={[0.090, 0.056, 0.170]} />
          <meshStandardMaterial color={SHOES} roughness={0.90} />
        </mesh>
      </group>

      {/* ── Right leg ── */}
      <group position={[0.10, 0.15, 0]}>
        <mesh position={[0, -0.18, 0]} castShadow>
          <cylinderGeometry args={[0.068, 0.062, 0.36, 10]} />
          <meshStandardMaterial color={PANTS} roughness={0.90} />
        </mesh>
        <mesh position={[0, -0.38, 0]} castShadow>
          <cylinderGeometry args={[0.056, 0.050, 0.30, 10]} />
          <meshStandardMaterial color={SKIN} roughness={0.65} />
        </mesh>
        <mesh position={[0, -0.548, 0.028]} castShadow>
          <boxGeometry args={[0.090, 0.056, 0.170]} />
          <meshStandardMaterial color={SHOES} roughness={0.90} />
        </mesh>
      </group>
    </group>
  );
}

// ─── SignAvatar (public export) ───────────────────────────────────────────────

export interface SignAvatarProps {
  currentGesture?: string;
  isActive?: boolean;
  speed?: number;
  label?: string;
}

export function SignAvatar({
  currentGesture = "neutral",
  isActive = false,
  speed = 1,
  label,
}: SignAvatarProps) {
  return (
    <div
      style={{ width: "100%", height: "100%", position: "relative" }}
      role="img"
      aria-label={label ?? "Sign language avatar"}
    >
      <Canvas
        camera={{ position: [0, 0.30, 4.0], fov: 40 }}
        shadows
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight
          position={[2.5, 5, 3.5]} intensity={1.3} castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-near={0.5} shadow-camera-far={12}
          shadow-camera-left={-2} shadow-camera-right={2}
          shadow-camera-top={3}   shadow-camera-bottom={-2}
        />
        <directionalLight position={[-1.5, 1.5, 3]} intensity={0.45} />
        <pointLight position={[0, 2.5, -2.5]} intensity={0.35} color="#e8d8a0" />
        <directionalLight position={[0, 4, -1]} intensity={0.20} color="#a0c8ff" />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.0, 0]} receiveShadow>
          <circleGeometry args={[3.5, 36]} />
          <meshStandardMaterial color="#0a2830" roughness={1} />
        </mesh>

        <HumanoidAvatar currentGesture={currentGesture} isActive={isActive} speed={speed} />

        <Environment preset="studio" />
        <OrbitControls
          enableZoom={false} enablePan={false}
          maxPolarAngle={Math.PI / 2.1} minPolarAngle={Math.PI / 5}
          target={[0, 0.30, 0]}
        />
      </Canvas>

      {/* LIVE badge */}
      {isActive && currentGesture !== "neutral" && (
        <div style={{
          position: "absolute", top: 12, right: 12,
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(0,201,160,0.12)",
          border: "1px solid rgba(0,201,160,0.35)",
          borderRadius: 100, padding: "5px 12px",
          fontSize: "0.70rem", fontWeight: 800, color: "#00C9A0",
          letterSpacing: "0.10em", textTransform: "uppercase",
          fontFamily: "'Tajawal', sans-serif",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%", background: "#00C9A0",
            animation: "sa-dot 1.2s ease-in-out infinite",
          }} />
          LIVE
          <style>{`@keyframes sa-dot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.6);opacity:.5}}`}</style>
        </div>
      )}

      {/* Gesture label */}
      {currentGesture !== "neutral" && GESTURES[currentGesture] && (
        <div style={{
          position: "absolute", bottom: 46, left: "50%", transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
          color: "rgba(240,244,248,0.85)", fontSize: "0.78rem", fontWeight: 600,
          borderRadius: 100, padding: "4px 14px",
          fontFamily: "'Tajawal', sans-serif", whiteSpace: "nowrap",
        }}>
          {GESTURES[currentGesture].nameAr}
        </div>
      )}
    </div>
  );
}
