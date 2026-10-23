import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * ThreeHeroCanvas
 * An interactive, dimensional 3D visualization of a distributed workflow DAG.
 * Soft studio lighting, fine connection lines, and glowing data packets traveling
 * between nodes representing triggers, task queues, workers, and outputs.
 */
export default function ThreeHeroCanvas({ onSelectNode, isDarkMode = false }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 18, 42);
    camera.lookAt(0, 0, 0);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 3. Studio Lighting
    const ambientLight = new THREE.AmbientLight(isDarkMode ? 0x222630 : 0xf0f3f8, 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, isDarkMode ? 1.4 : 1.8);
    keyLight.position.set(20, 35, 25);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x0071e3, 0.6); // Apple Blue fill
    fillLight.position.set(-20, 10, -10);
    scene.add(fillLight);

    // 4. Node Definitions in 3D Space
    const nodeDefs = [
      { id: 'trigger', label: 'Webhook Ingress', role: 'Trigger', color: 0xaf52de, pos: new THREE.Vector3(-18, 0, 0), icon: '⚡' },
      { id: 'queue', label: 'RabbitMQ Broker', role: 'Queue', color: 0x0071e3, pos: new THREE.Vector3(-8, 2, 4), icon: '📦' },
      { id: 'worker1', label: 'Worker A (HTTP)', role: 'Compute', color: 0x34c759, pos: new THREE.Vector3(4, 5, -5), icon: '🌐' },
      { id: 'worker2', label: 'Worker B (Transform)', role: 'Compute', color: 0x34c759, pos: new THREE.Vector3(4, -3, 8), icon: '⚙️' },
      { id: 'join', label: 'Redis State Sync', role: 'Store', color: 0x0071e3, pos: new THREE.Vector3(16, 1, 1), icon: '🔄' },
      { id: 'dlq', label: 'Dead-Letter Vault', role: 'DLQ', color: 0xff3b30, pos: new THREE.Vector3(8, -8, -6), icon: '💀' }
    ];

    const nodeMeshes = [];
    const group = new THREE.Group();
    scene.add(group);

    // Create 3D Rounded Node Tablets
    nodeDefs.forEach((def) => {
      const nodeGroup = new THREE.Group();
      nodeGroup.position.copy(def.pos);
      nodeGroup.userData = def;

      // Base Tablet / Chassis
      const geom = new THREE.BoxGeometry(4.2, 2.2, 0.7);
      const mat = new THREE.MeshPhysicalMaterial({
        color: isDarkMode ? 0x1c1c1e : 0xffffff,
        roughness: 0.25,
        metalness: 0.1,
        clearcoat: 0.4,
        clearcoatRoughness: 0.1
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      nodeGroup.add(mesh);

      // Colored Indicator Bar
      const barGeom = new THREE.BoxGeometry(0.25, 1.6, 0.75);
      const barMat = new THREE.MeshStandardMaterial({
        color: def.color,
        emissive: def.color,
        emissiveIntensity: 0.35,
        roughness: 0.2
      });
      const bar = new THREE.Mesh(barGeom, barMat);
      bar.position.set(-1.8, 0, 0);
      nodeGroup.add(bar);

      // Subtle Outer Aura Ring
      const ringGeom = new THREE.RingGeometry(2.4, 2.5, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: def.color,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -1.2;
      nodeGroup.add(ring);

      group.add(nodeGroup);
      nodeMeshes.push(nodeGroup);
    });

    // 5. Connection Edges with Curves
    const connections = [
      { from: 0, to: 1 }, // Trigger -> RabbitMQ
      { from: 1, to: 2 }, // RabbitMQ -> Worker A
      { from: 1, to: 3 }, // RabbitMQ -> Worker B
      { from: 2, to: 4 }, // Worker A -> Redis Sync
      { from: 3, to: 4 }, // Worker B -> Redis Sync
      { from: 2, to: 5 }  // Worker A (fail branch) -> DLQ
    ];

    const curves = [];
    connections.forEach((conn) => {
      const p1 = nodeDefs[conn.from].pos;
      const p2 = nodeDefs[conn.to].pos;
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      mid.y += 2.0; // Arch curve

      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      curves.push(curve);

      // Edge line
      const points = curve.getPoints(40);
      const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: isDarkMode ? 0x3a3a40 : 0xd1d1d6,
        transparent: true,
        opacity: 0.8,
        linewidth: 1
      });
      const line = new THREE.Line(lineGeom, lineMat);
      group.add(line);
    });

    // 6. Traveling Data Packets (Photons)
    const packets = [];
    const packetGeom = new THREE.SphereGeometry(0.35, 16, 16);
    curves.forEach((curve, idx) => {
      const color = idx === 5 ? 0xff3b30 : 0x0071e3; // Red for DLQ branch, Apple Blue for normal
      const packetMat = new THREE.MeshBasicMaterial({ color });
      const packetMesh = new THREE.Mesh(packetGeom, packetMat);
      group.add(packetMesh);

      // Packet Glow
      const glowGeom = new THREE.SphereGeometry(0.7, 12, 12);
      const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 });
      const glow = new THREE.Mesh(glowGeom, glowMat);
      packetMesh.add(glow);

      packets.push({
        mesh: packetMesh,
        curve,
        progress: (idx * 0.18) % 1,
        speed: 0.0035 + (idx % 3) * 0.001
      });
    });

    // 7. Interactive Hover & Raycasting
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);
    let hoveredNode = null;

    const onPointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onClick = () => {
      if (hoveredNode && onSelectNode) {
        onSelectNode(hoveredNode.userData);
      }
    };

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('click', onClick);

    // 8. Animation Loop
    let animId;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Subtle scene floating rotation
      group.rotation.y = Math.sin(elapsedTime * 0.15) * 0.15;
      group.rotation.x = Math.cos(elapsedTime * 0.12) * 0.06;

      // Animate node hover & gentle bobbing
      nodeMeshes.forEach((n, i) => {
        n.position.y = nodeDefs[i].pos.y + Math.sin(elapsedTime * 1.5 + i) * 0.25;
      });

      // Animate data packets along curves
      packets.forEach((p) => {
        p.progress += p.speed;
        if (p.progress > 1) p.progress = 0;
        const pt = p.curve.getPoint(p.progress);
        p.mesh.position.copy(pt);
      });

      // Raycasting for interactive hover
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes, true);

      if (intersects.length > 0) {
        let rootGroup = intersects[0].object;
        while (rootGroup.parent && rootGroup.parent !== group) {
          rootGroup = rootGroup.parent;
        }
        if (hoveredNode !== rootGroup) {
          if (hoveredNode) hoveredNode.scale.set(1, 1, 1);
          hoveredNode = rootGroup;
          hoveredNode.scale.set(1.1, 1.1, 1.1);
          container.style.cursor = 'pointer';
        }
      } else {
        if (hoveredNode) {
          hoveredNode.scale.set(1, 1, 1);
          hoveredNode = null;
          container.style.cursor = 'default';
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('click', onClick);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isDarkMode, onSelectNode]);

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        touchAction: 'none'
      }}
    />
  );
}
