'use client';

import { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Rotate3d, ZoomIn, Eye } from 'lucide-react';

function StylizedFigure({ color = '#E63329' }: { color?: string }) {
  const meshRef = useRef<THREE.Group>(null);

  // Subtle breathing animation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 1.5) * 0.05 - 0.2;
    }
  });

  return (
    <group ref={meshRef} dispose={null}>
      {/* Figure Base Pedestal */}
      <mesh position={[0, -1.2, 0]}>
        <cylinderGeometry args={[1.2, 1.3, 0.2, 32]} />
        <meshStandardMaterial color="#111118" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, -1.08, 0]}>
        <cylinderGeometry args={[1.1, 1.1, 0.05, 32]} />
        <meshStandardMaterial color="#E63329" emissive="#E63329" emissiveIntensity={0.6} />
      </mesh>

      {/* Stylized Anime Collectible Body */}
      {/* Torso */}
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.35, 0.28, 0.9, 16]} />
        <meshStandardMaterial color="#1A1A24" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Armor / Sash */}
      <mesh position={[0, -0.1, 0.05]}>
        <boxGeometry args={[0.75, 0.4, 0.4]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.4} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshStandardMaterial color="#FDE2D2" roughness={0.6} />
      </mesh>

      {/* Anime Hair (Spiky stylized geometry) */}
      <group position={[0, 0.65, -0.05]}>
        <mesh position={[0, 0.2, 0]} rotation={[0.2, 0, 0]}>
          <coneGeometry args={[0.38, 0.6, 6]} />
          <meshStandardMaterial color="#FFD700" roughness={0.3} />
        </mesh>
        <mesh position={[-0.2, 0.15, 0.1]} rotation={[0.2, 0, 0.4]}>
          <coneGeometry args={[0.18, 0.5, 5]} />
          <meshStandardMaterial color="#FFC700" roughness={0.3} />
        </mesh>
        <mesh position={[0.2, 0.15, 0.1]} rotation={[0.2, 0, -0.4]}>
          <coneGeometry args={[0.18, 0.5, 5]} />
          <meshStandardMaterial color="#FFC700" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.35, -0.1]} rotation={[-0.3, 0, 0]}>
          <coneGeometry args={[0.25, 0.6, 5]} />
          <meshStandardMaterial color="#FFB700" roughness={0.3} />
        </mesh>
      </group>

      {/* Aura / Ki Orb */}
      <Float speed={2.5} rotationIntensity={1.5} floatIntensity={1.5}>
        <mesh position={[0.6, 0.2, 0.4]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial
            color="#00F5D4"
            emissive="#00F5D4"
            emissiveIntensity={2}
            transparent
            opacity={0.85}
          />
        </mesh>
      </Float>

      {/* Katana / Weapon prop */}
      <mesh position={[-0.45, -0.1, 0.2]} rotation={[0.2, 0.2, -0.6]}>
        <cylinderGeometry args={[0.02, 0.02, 1.4, 8]} />
        <meshStandardMaterial color="#D1D5DB" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[-0.2, -0.5, 0.45]} rotation={[0.2, 0.2, -0.6]}>
        <cylinderGeometry args={[0.04, 0.04, 0.3, 8]} />
        <meshStandardMaterial color="#E63329" roughness={0.5} />
      </mesh>
    </group>
  );
}

export default function Model3DViewer({
  modelUrl,
  productName,
}: {
  modelUrl?: string | null;
  productName: string;
}) {
  const [autoRotate, setAutoRotate] = useState(true);

  return (
    <div className="relative w-full h-full min-h-[350px] bg-gradient-to-b from-gray-900 via-[#12121c] to-[#0a0a0f] select-none flex flex-col justify-between overflow-hidden">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 1, 3.5], fov: 45 }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <ambientLight intensity={0.7} />
        <spotLight position={[10, 15, 10]} angle={0.3} penumbra={1} intensity={1.5} castShadow />
        <pointLight position={[-10, -5, -10]} intensity={0.5} color="#7B2FBE" />
        <pointLight position={[0, 3, 2]} intensity={0.8} color="#E63329" />

        <Suspense fallback={null}>
          <StylizedFigure />
          <ContactShadows position={[0, -1.3, 0]} opacity={0.7} scale={5} blur={1.5} far={2} />
        </Suspense>

        <OrbitControls
          enableZoom={true}
          maxPolarAngle={Math.PI / 2 + 0.1}
          minPolarAngle={Math.PI / 6}
          minDistance={1.8}
          maxDistance={6}
          autoRotate={autoRotate}
          autoRotateSpeed={2}
        />
      </Canvas>

      {/* HUD Controls */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <span className="flex items-center gap-1.5 bg-brand-red/90 text-white text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 backdrop-blur-md">
          <Eye className="w-3 h-3" />
          Interactive 3D Preview
        </span>
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-black/80 text-white text-xs px-4 py-2 border border-white/10 backdrop-blur-md">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`flex items-center gap-1.5 text-[11px] font-medium tracking-wide transition-colors ${
            autoRotate ? 'text-brand-red font-bold' : 'text-gray-300 hover:text-white'
          }`}
        >
          <Rotate3d className="w-3.5 h-3.5" />
          {autoRotate ? 'Auto-Rotating' : 'Rotate Paused'}
        </button>
        <span className="text-gray-500">|</span>
        <span className="flex items-center gap-1 text-[11px] text-gray-300">
          <ZoomIn className="w-3.5 h-3.5" /> Scroll to Zoom & Drag to Inspect
        </span>
      </div>
    </div>
  );
}
