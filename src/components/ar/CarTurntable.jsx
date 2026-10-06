import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";

/* ------------------------------------------------------------------ */
/* Tunables                                                            */
/* ------------------------------------------------------------------ */
const STAGE_RADIUS = 3.2; // turntable disc radius (world units)
const CAR_LENGTH = 2.6; // longest model dimension after normalising
const BASE_POLAR = THREE.MathUtils.degToRad(74); // camera angle from vertical
const CURSOR_YAW_RANGE = Math.PI * 0.85; // yaw swing across full window width
const CURSOR_TILT_RANGE = THREE.MathUtils.degToRad(5);
const IDLE_DELAY_MS = 3500;
const IDLE_SPIN_SPEED = 0.22; // rad / second
const DRAG_SENSITIVITY = 0.0085;

/* ------------------------------------------------------------------ */
/* Shared loader (decoders are expensive to spin up)                   */
/* ------------------------------------------------------------------ */
let sharedLoader = null;
const getLoader = () => {
  if (sharedLoader) return sharedLoader;
  const draco = new DRACOLoader();
  draco.setDecoderPath("/decoders/draco/");
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);
  sharedLoader = loader;
  return loader;
};

const disposeObject = (root) => {
  root.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
    if (node.material) {
      const materials = Array.isArray(node.material)
        ? node.material
        : [node.material];
      materials.forEach((material) => {
        Object.values(material).forEach((value) => {
          if (value && value.isTexture) value.dispose();
        });
        material.dispose();
      });
    }
  });
};

/* ------------------------------------------------------------------ */
/* Procedural textures                                                 */
/* ------------------------------------------------------------------ */
const toRgba = (color, alpha = 1) => {
  const c = new THREE.Color(color);
  return `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(
    c.b * 255,
  )}, ${alpha})`;
};

/** Turntable surface: team gradient, concentric grooves, a darker outer track with degree ticks. */
const createStageTexture = (color, edgeColor) => {
  const size = 1024;
  const half = size / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const base = new THREE.Color(color);
  const edge = new THREE.Color(edgeColor);
  const mid = base.clone().lerp(edge, 0.5);

  const gradient = ctx.createRadialGradient(half, half, size * 0.04, half, half, half);
  gradient.addColorStop(0, toRgba(base.clone().lerp(new THREE.Color("#ffffff"), 0.12)));
  gradient.addColorStop(0.38, toRgba(base));
  gradient.addColorStop(0.72, toRgba(mid));
  gradient.addColorStop(1, toRgba(edge));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Concentric grooves
  ctx.lineWidth = 2;
  [0.16, 0.26, 0.36, 0.46].forEach((r, i) => {
    ctx.strokeStyle = `rgba(255,255,255,${0.1 - i * 0.02})`;
    ctx.beginPath();
    ctx.arc(half, half, size * r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Inner edge highlight of the track
  ctx.strokeStyle = toRgba(base.clone().lerp(new THREE.Color("#ffffff"), 0.35), 0.5);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(half, half, size * 0.425, 0, Math.PI * 2);
  ctx.stroke();

  // Fine grain noise so the gradient never bands
  const image = ctx.getImageData(0, 0, size, size);
  const { data } = image;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    data[i] = Math.max(0, Math.min(255, data[i] + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
  }
  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};

/** Soft radial halo that sits under the turntable. */
const createHaloTexture = (color) => {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, toRgba(color, 0));
  gradient.addColorStop(0.62, toRgba(color, 0));
  gradient.addColorStop(0.7, toRgba(color, 0.55));
  gradient.addColorStop(0.8, toRgba(color, 0.18));
  gradient.addColorStop(1, toRgba(color, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

/* Blurred, radially faded reflection on the turntable surface */
const ReflectorFadeShader = {
  name: "TurntableReflectorShader",
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec2 vLocalUv;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vLocalUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    varying vec4 vUv;
    varying vec2 vLocalUv;
    #include <logdepthbuf_pars_fragment>
    vec4 blurSample(sampler2D tex, vec4 uv) {
      vec2 s = vec2(0.006) * uv.w;
      vec4 c = texture2DProj(tex, uv) * 0.24;
      c += texture2DProj(tex, uv + vec4(-s.x, 0.0, 0.0, 0.0)) * 0.13;
      c += texture2DProj(tex, uv + vec4( s.x, 0.0, 0.0, 0.0)) * 0.13;
      c += texture2DProj(tex, uv + vec4(0.0, -s.y, 0.0, 0.0)) * 0.13;
      c += texture2DProj(tex, uv + vec4(0.0,  s.y, 0.0, 0.0)) * 0.13;
      c += texture2DProj(tex, uv + vec4(-s.x, -s.y, 0.0, 0.0)) * 0.06;
      c += texture2DProj(tex, uv + vec4( s.x, -s.y, 0.0, 0.0)) * 0.06;
      c += texture2DProj(tex, uv + vec4(-s.x,  s.y, 0.0, 0.0)) * 0.06;
      c += texture2DProj(tex, uv + vec4( s.x,  s.y, 0.0, 0.0)) * 0.06;
      return c;
    }
    void main() {
      #include <logdepthbuf_fragment>
      vec4 reflected = blurSample(tDiffuse, vUv);
      float fade = 1.0 - smoothstep(0.18, 0.42, distance(vLocalUv, vec2(0.5)));
      gl_FragColor = vec4(reflected.rgb, reflected.a * fade * 0.3);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export const CarTurntable = ({
  src,
  color = "#7500AD",
  edgeColor = "#22003a",
  className,
  onProgress,
}) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const loadTokenRef = useRef(0);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  /* ---------- one-time scene setup ---------- */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.domElement.classList.add("car-turntable__canvas");
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
    const cameraTarget = new THREE.Vector3(0, 0.3, 0);

    // Environment lighting
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.55;
    pmrem.dispose();

    scene.add(new THREE.HemisphereLight(0xffffff, 0x4a4a58, 0.6));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    scene.add(keyLight, keyLight.target);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.9);
    fillLight.position.set(-3.6, 2.6, 4.8);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xe8f0ff, 0.5);
    rimLight.position.set(-2.2, 2.6, -5.8);
    scene.add(rimLight);
    const shadowLight = new THREE.DirectionalLight(0xffffff, 0.7);
    shadowLight.position.set(0.2, 10, 1.4);
    shadowLight.castShadow = true;
    shadowLight.shadow.mapSize.set(1024, 1024);
    shadowLight.shadow.bias = -0.0002;
    shadowLight.shadow.radius = 5;
    Object.assign(shadowLight.shadow.camera, {
      left: -3.2,
      right: 3.2,
      top: 3.2,
      bottom: -3.2,
      near: 1,
      far: 16,
    });
    shadowLight.shadow.camera.updateProjectionMatrix();
    scene.add(shadowLight);

    // Static halo under the stage
    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(STAGE_RADIUS * 1.45, 96),
      new THREE.MeshBasicMaterial({
        map: createHaloTexture(color),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = -0.01;
    scene.add(halo);

    // Rotating turntable group (disc + rim + car)
    const turntable = new THREE.Group();
    scene.add(turntable);

    const discGeometry = new THREE.CircleGeometry(STAGE_RADIUS, 128);
    const disc = new THREE.Mesh(
      discGeometry,
      new THREE.MeshBasicMaterial({
        map: createStageTexture(color, edgeColor),
        toneMapped: false,
      }),
    );
    disc.rotation.x = -Math.PI / 2;
    turntable.add(disc);

    // Raised rim (gives the platform a physical edge)
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(STAGE_RADIUS, STAGE_RADIUS * 1.01, 0.09, 128, 1, true),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        metalness: 0.6,
        roughness: 0.3,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.35,
        side: THREE.DoubleSide,
      }),
    );
    rim.position.y = -0.045;
    turntable.add(rim);

    const glowRing = new THREE.Mesh(
      new THREE.RingGeometry(STAGE_RADIUS * 0.995, STAGE_RADIUS * 1.006, 128),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.45),
        toneMapped: false,
        transparent: true,
        opacity: 0.9,
      }),
    );
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.position.y = 0.003;
    turntable.add(glowRing);

    const carHolder = new THREE.Group();
    turntable.add(carHolder);

    // Shadow catcher + reflection (static, they are radially symmetric)
    const shadowPlane = new THREE.Mesh(
      discGeometry,
      new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.45, transparent: true }),
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.002;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    const reflector = new Reflector(discGeometry, {
      clipBias: 0.003,
      textureWidth: 512,
      textureHeight: 512,
      color: 0xffffff,
      shader: ReflectorFadeShader,
    });
    reflector.material.transparent = true;
    reflector.material.depthWrite = false;
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.y = 0.004;
    const baseReflectorRender = reflector.onBeforeRender;
    reflector.onBeforeRender = (...args) => {
      disc.visible = false;
      shadowPlane.visible = false;
      glowRing.visible = false;
      baseReflectorRender.apply(reflector, args);
      disc.visible = true;
      shadowPlane.visible = true;
      glowRing.visible = true;
    };
    scene.add(reflector);

    /* ---------- camera framing ---------- */
    const framing = { distance: CAR_LENGTH * 1.2, height: 0.3 };
    const spherical = new THREE.Spherical();
    const updateCamera = (polar) => {
      const aspect = camera.aspect || 1;
      // Pull back on narrow (portrait) screens so the car never clips.
      const narrowBoost = aspect < 1.5 ? Math.min(1.5 / aspect, 2.2) : 1;
      spherical.set(framing.distance * narrowBoost * motion.zoom, polar, Math.PI / 4.5);
      cameraTarget.set(0, framing.height, 0);
      camera.position.setFromSpherical(spherical).add(cameraTarget);
      camera.lookAt(cameraTarget);
    };

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      if (!clientWidth || !clientHeight) return;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    /* ---------- interaction state ---------- */
    const motion = {
      baseYaw: -0.6,
      velocity: 0,
      tilt: 0,
      zoom: 1,
      dragging: false,
      lastX: 0,
      lastY: 0,
      pinchDistance: 0,
      lastInteraction: performance.now(),
      inView: true,
      intro: null,
    };

    const canvas = renderer.domElement;
    const activePointers = new Map();

    const onPointerDown = (event) => {
      activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (activePointers.size === 1) {
        motion.dragging = true;
        motion.lastX = event.clientX;
        motion.lastY = event.clientY;
        motion.velocity = 0;
        motion.lastInteraction = performance.now();
      } else {
        motion.dragging = false;
      }
      canvas.setPointerCapture?.(event.pointerId);
      canvas.classList.add("is-dragging");
    };
    
    const onPointerMove = (event) => {
      if (!activePointers.has(event.pointerId) && !motion.dragging) return;
      if (activePointers.has(event.pointerId)) {
        activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }
      
      if (activePointers.size === 1 && motion.dragging) {
        const dx = event.clientX - motion.lastX;
        const dy = event.clientY - motion.lastY;
        motion.lastX = event.clientX;
        motion.lastY = event.clientY;
        const deltaX = dx * DRAG_SENSITIVITY;
        motion.baseYaw += deltaX;
        motion.velocity = deltaX;
        motion.tilt += dy * DRAG_SENSITIVITY * 0.4;
        motion.tilt = Math.max(Math.min(motion.tilt, 0.15), -0.15);
        motion.lastInteraction = performance.now();
      } else if (activePointers.size === 2) {
        const pts = Array.from(activePointers.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (motion.pinchDistance) {
          const delta = motion.pinchDistance - dist;
          motion.zoom += delta * 0.005;
          motion.zoom = Math.max(0.3, Math.min(motion.zoom, 2.5));
          motion.lastInteraction = performance.now();
        }
        motion.pinchDistance = dist;
      }
    };
    
    const onPointerUp = (event) => {
      activePointers.delete(event.pointerId);
      if (activePointers.size === 0) {
        motion.dragging = false;
        canvas.classList.remove("is-dragging");
      }
      motion.pinchDistance = 0;
      canvas.releasePointerCapture?.(event.pointerId);
    };

    const onWheel = (event) => {
      event.preventDefault();
      motion.zoom += event.deltaY * 0.001;
      motion.zoom = Math.max(0.3, Math.min(motion.zoom, 2.5));
      motion.lastInteraction = performance.now();
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        motion.inView = entry.isIntersecting;
      },
      { threshold: 0.05 },
    );
    visibilityObserver.observe(container);

    /* ---------- render loop ---------- */
    const clock = new THREE.Clock();
    let frameId;
    const tick = () => {
      frameId = window.requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!motion.inView || document.hidden) return;

      const now = performance.now();
      if (!motion.dragging) {
        motion.baseYaw += motion.velocity;
        motion.velocity *= 0.93;
        if (!prefersReducedMotion && now - motion.lastInteraction > IDLE_DELAY_MS) {
          motion.baseYaw += IDLE_SPIN_SPEED * dt;
        }
      }
      turntable.rotation.y = motion.baseYaw;

      // New-model "drop in" micro-animation
      if (motion.intro) {
        const t = Math.min((now - motion.intro) / 700, 1);
        const k = 1 - (1 - t) ** 3;
        carHolder.position.y = (1 - k) * 0.35;
        carHolder.scale.setScalar(0.9 + 0.1 * k);
        if (t >= 1) motion.intro = null;
      }

      updateCamera(BASE_POLAR + motion.tilt);
      keyLight.position.copy(camera.position).add(new THREE.Vector3(1.2, 0.9, 0.3));
      keyLight.target.position.copy(cameraTarget);
      renderer.render(scene, camera);
    };
    tick();

    sceneRef.current = {
      carHolder,
      disc,
      rim,
      glowRing,
      halo,
      framing,
      motion,
    };

    return () => {
      loadTokenRef.current += 1;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      disposeObject(carHolder);
      disposeObject(turntable);
      disposeObject(halo);
      shadowPlane.material.dispose();
      reflector.dispose();
      envRT.dispose();
      renderer.dispose();
      canvas.remove();
      sceneRef.current = null;
    };
    // Scene is built once; colour + model changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- team colour changes ---------- */
  useEffect(() => {
    const stage = sceneRef.current;
    if (!stage) return;
    const oldDiscMap = stage.disc.material.map;
    stage.disc.material.map = createStageTexture(color, edgeColor);
    stage.disc.material.needsUpdate = true;
    oldDiscMap?.dispose();

    const oldHaloMap = stage.halo.material.map;
    stage.halo.material.map = createHaloTexture(color);
    stage.halo.material.needsUpdate = true;
    oldHaloMap?.dispose();

    stage.rim.material.color.set(color);
    stage.rim.material.emissive.set(color);
    stage.glowRing.material.color
      .set(color)
      .lerp(new THREE.Color("#ffffff"), 0.45);
  }, [color, edgeColor]);

  /* ---------- model loading ---------- */
  useEffect(() => {
    const stage = sceneRef.current;
    if (!stage || !src) return undefined;
    const token = ++loadTokenRef.current;
    const { carHolder, framing, motion } = stage;

    onProgressRef.current?.(0.05);
    getLoader().load(
      src,
      (gltf) => {
        if (token !== loadTokenRef.current) {
          disposeObject(gltf.scene);
          return;
        }
        while (carHolder.children.length) {
          const old = carHolder.children[0];
          carHolder.remove(old);
          disposeObject(old);
        }

        const model = gltf.scene;
        model.traverse((node) => {
          if (!node.isMesh) return;
          node.castShadow = true;
          node.receiveShadow = true;
          const materials = Array.isArray(node.material)
            ? node.material
            : [node.material];
          materials.forEach((material) => {
            if (material && "envMapIntensity" in material) {
              material.envMapIntensity = 1;
            }
          });
        });

        // Normalise size, centre, and sit on the turntable surface
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const scale = CAR_LENGTH / Math.max(size.x, size.y, size.z, 0.001);
        model.position.sub(center);
        model.scale.setScalar(scale);
        const scaledBox = new THREE.Box3().setFromObject(model);
        model.position.y -= scaledBox.min.y;
        carHolder.add(model);

        const finalBox = new THREE.Box3().setFromObject(model);
        const finalSize = finalBox.getSize(new THREE.Vector3());
        framing.distance = Math.max(
          Math.max(finalSize.x, finalSize.y, finalSize.z) * 1.22,
          2.2,
        );
        framing.height = finalSize.y * 0.3;

        motion.intro = performance.now();
        onProgressRef.current?.(1);
      },
      (event) => {
        if (token === loadTokenRef.current && event.total) {
          onProgressRef.current?.(Math.min(event.loaded / event.total, 0.95));
        }
      },
      (error) => {
        if (token !== loadTokenRef.current) return;
        console.error("[CarTurntable] Failed to load model", src, error);
        onProgressRef.current?.(1);
      },
    );

    return () => {
      loadTokenRef.current += 1;
    };
  }, [src]);

  return <div ref={containerRef} className={className} style={{ width: "100%", height: "100%", overflow: "hidden", display: "block" }} />;
};

export default CarTurntable;
