import * as THREE from "three";
import sectorBoundaries from "../config/f1/sectorBoundaries.json";

/**
 * TrackBuilder: Procedural 3D Track Generator
 *
 * Generates a complete Three.js track scene from raw GPS telemetry data.
 * Replaces hand-built Blender GLTF files with automatic geometry.
 *
 * Pipeline: GPS [{x,y}] → CatmullRom spline → Ribbon mesh → Sector coloring → Labels
 */

// ─── Constants ───────────────────────────────────────────────────────
const TRACK_WIDTH = 0.5;
const TRACK_RESOLUTION = 600;       // Points sampled along spline
const RUNOFF_WIDTH = 1.5;           // Wider ground plane around track
const KERB_WIDTH = 0.1;
const SECTOR_COLORS = [
  new THREE.Color(0.35, 0.02, 0.02),   // Sector 1 — deep red
  new THREE.Color(0.02, 0.02, 0.35),   // Sector 2 — deep blue
  new THREE.Color(0.32, 0.28, 0.02),   // Sector 3 — deep gold
];
const SECTOR_EMISSIVE = [
  new THREE.Color(0.6, 0.0, 0.0),
  new THREE.Color(0.0, 0.0, 0.6),
  new THREE.Color(0.6, 0.5, 0.0),
];

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Normalize raw GPS points: center at origin, scale to fit a target scene size.
 * Returns { points: Vector2[], center, scale }
 */
function normalizeGPSPoints(rawPoints, targetSize = 20) {
  if (!rawPoints || rawPoints.length < 10) return null;

  // Filter out invalid GPS coordinates and deduplicate very close points (< 0.5 units apart)
  const validPoints = rawPoints.filter(p => typeof p.x === 'number' && typeof p.y === 'number' && !isNaN(p.x) && !isNaN(p.y));
  if (validPoints.length < 10) return null;

  const deduped = [validPoints[0]];
  for (let i = 1; i < validPoints.length; i++) {
    const prev = deduped[deduped.length - 1];
    const dx = validPoints[i].x - prev.x;
    const dy = validPoints[i].y - prev.y;
    if (Math.sqrt(dx * dx + dy * dy) > 0.5) {
      deduped.push(validPoints[i]);
    }
  }

  // Compute bounds
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of deduped) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  // USE A SINGLE SCALE FACTOR TO PRESERVE ASPECT RATIO!
  const maxRange = Math.max(rangeX, rangeY);
  const scaleFactor = targetSize / maxRange;

  const points = deduped.map(p => new THREE.Vector2(
    (p.x - cx) * scaleFactor,
    (p.y - cy) * scaleFactor,
  ));

  return { points, center: new THREE.Vector2(cx, cy), scale: scaleFactor };
}

/**
 * Safely computes and normalizes a tangent vector to prevent NaN errors
 * if the points are identical.
 */
function safeTangent(next, prev) {
  const t = new THREE.Vector3().subVectors(next, prev);
  if (t.lengthSq() < 0.000001) return new THREE.Vector3(1, 0, 0);
  return t.normalize();
}

/**
 * Build a closed CatmullRom spline from 2D points.
 * Converts to 3D with z = 0 (track lives on the XY plane matching ThreeCanvas convention).
 */
function buildSpline(points2D) {
  const pts3D = points2D.map(p => new THREE.Vector3(p.x, p.y, 0));
  return new THREE.CatmullRomCurve3(pts3D, false, "catmullrom", 0.3);
}

/**
 * Create a flat ribbon mesh along a spline with per-vertex sector coloring.
 */
function createRibbonGeometry(curve, width, resolution, sectorColors, sectorBounds = [0.333, 0.666]) {
  const points = curve.getSpacedPoints(resolution);
  const tangents = [];

  // Compute tangents
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    const prev = points[(i - 1 + points.length) % points.length];
    tangents.push(safeTangent(next, prev));
  }

  // Build geometry
  const positions = [];
  const colors = [];
  const indices = [];
  const normals = [];
  const halfW = width / 2;

  for (let i = 0; i < points.length; i++) {
    const t = tangents[i];
    // Normal in XY plane (perpendicular to tangent, pointing outward)
    const n = new THREE.Vector3(-t.y, t.x, 0);
    const p = points[i];

    // Ramp the Z coordinate slightly so the end cleanly overlaps the start
    // We use a very small offset (0.01) so it sits flat on the black runoff without z-fighting
    const zOffset = 0.01 + (i / points.length) * 0.001;

    // Left vertex
    positions.push(p.x + n.x * halfW, p.y + n.y * halfW, zOffset);
    // Right vertex
    positions.push(p.x - n.x * halfW, p.y - n.y * halfW, zOffset);

    // Normals (pointing up)
    normals.push(0, 0, 1);
    normals.push(0, 0, 1);

    // Sector color based on actual time-based boundaries
    const progress = i / points.length;
    let sectorIdx = 2; // Default to sector 3
    if (progress < sectorBounds[0]) sectorIdx = 0;
    else if (progress < sectorBounds[1]) sectorIdx = 1;

    const col = sectorColors ? sectorColors[sectorIdx] : new THREE.Color(0.08, 0.08, 0.08);
    colors.push(col.r, col.g, col.b);
    colors.push(col.r, col.g, col.b);

    // Indices (two triangles per quad)
    if (i < points.length - 1) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 3, base + 2);
    }
  }

  // Close the loop: connect last quad to first
  const last = (points.length - 1) * 2;
  indices.push(last, last + 1, 0);
  indices.push(last + 1, 1, 0);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geom.setIndex(indices);

  return geom;
}

/**
 * Create white dashed center line along the track.
 */
function createCenterLine(curve, resolution) {
  const points = curve.getSpacedPoints(resolution);
  const geom = new THREE.BufferGeometry().setFromPoints(
    points.map(p => new THREE.Vector3(p.x, p.y, 0.02)) // Just above track (0.01)
  );

  return new THREE.Line(geom, new THREE.LineDashedMaterial({
    color: 0x444444,
    dashSize: 0.3,
    gapSize: 0.6,
    linewidth: 1,
    transparent: true,
    opacity: 0.3,
  }));
}

/**
 * Create track edge lines (kerbs) with sector glow.
 */
function createEdgeLines(curve, width, resolution, sectorBounds = [0.333, 0.666]) {
  const points = curve.getSpacedPoints(resolution);
  const leftPts = [];
  const rightPts = [];
  const leftColors = [];
  const rightColors = [];
  const halfW = width / 2;

  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    const prev = points[(i - 1 + points.length) % points.length];
    const tangent = safeTangent(next, prev);
    const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
    const p = points[i];

    leftPts.push(p.x + normal.x * halfW, p.y + normal.y * halfW, 0.02); // Just above track
    rightPts.push(p.x - normal.x * halfW, p.y - normal.y * halfW, 0.02);

    // Glowing sector kerbs
    const progress = i / points.length;
    let sectorIdx = 2;
    if (progress < sectorBounds[0]) sectorIdx = 0;
    else if (progress < sectorBounds[1]) sectorIdx = 1;

    const col = SECTOR_EMISSIVE[sectorIdx];
    leftColors.push(col.r, col.g, col.b);
    rightColors.push(col.r, col.g, col.b);
  }

  const createLine = (pts, cols) => {
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    geom.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    return new THREE.Line(geom, new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      linewidth: 2,
    }));
  };

  return [createLine(leftPts, leftColors), createLine(rightPts, rightColors)];
}

/**
 * Create a dark ground plane beneath the track.
 */
function createGroundPlane(curve, runoffWidth) {
  const points = curve.getSpacedPoints(TRACK_RESOLUTION);
  const tangents = [];
  const halfW = runoffWidth;

  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    const prev = points[(i - 1 + points.length) % points.length];
    tangents.push(safeTangent(next, prev));
  }

  const positions = [];
  const indices = [];

  for (let i = 0; i < points.length; i++) {
    const t = tangents[i];
    const n = new THREE.Vector3(-t.y, t.x, 0);
    const p = points[i];
    positions.push(p.x + n.x * halfW, p.y + n.y * halfW, 0);
    positions.push(p.x - n.x * halfW, p.y - n.y * halfW, 0);

    if (i < points.length - 1) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 3, base + 2);
    }
  }
  // Close loop
  const last = (points.length - 1) * 2;
  indices.push(last, last + 1, 0);
  indices.push(last + 1, 1, 0);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  return new THREE.Mesh(geom, new THREE.MeshBasicMaterial({
    color: 0x080808,
    side: THREE.DoubleSide,
  }));
}

/**
 * Create a start/finish line marker.
 */
function createStartFinishLine(curve, trackWidth) {
  const startPoint = curve.getPointAt(0);
  let startTangent = curve.getTangentAt(0);
  if (startTangent.lengthSq() < 0.000001) startTangent = new THREE.Vector3(1, 0, 0);
  else startTangent.normalize();
  
  const normal = new THREE.Vector3(-startTangent.y, startTangent.x, 0);
  const halfW = trackWidth / 2;

  // Checkerboard pattern using small quads
  const group = new THREE.Group();
  const checkerSize = trackWidth / 8;
  const lineWidth = checkerSize * 2;

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 8; col++) {
      const isWhite = (row + col) % 2 === 0;
      const geom = new THREE.PlaneGeometry(checkerSize, lineWidth / 2);
      const mat = new THREE.MeshBasicMaterial({
        color: isWhite ? 0xffffff : 0x111111,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geom, mat);

      const offset = (col - 3.5) * checkerSize;
      const rowOffset = (row - 0.5) * (lineWidth / 2);
      mesh.position.set(
        startPoint.x + normal.x * offset + startTangent.x * rowOffset,
        startPoint.y + normal.y * offset + startTangent.y * rowOffset,
        0.02, // Just above track
      );
      mesh.rotation.z = Math.atan2(startTangent.y, startTangent.x);
      group.add(mesh);
    }
  }

  return group;
}

/**
 * Create sector boundary markers as glowing lines across the track.
 */
function createSectorMarkers(curve, trackWidth) {
  const group = new THREE.Group();
  const sectorPositions = [0, 1 / 3, 2 / 3];
  const halfW = trackWidth / 2;

  sectorPositions.forEach((t, idx) => {
    const point = curve.getPointAt(t);
    let tangent = curve.getTangentAt(t);
    if (tangent.lengthSq() < 0.000001) tangent = new THREE.Vector3(1, 0, 0);
    else tangent.normalize();
    
    const normal = new THREE.Vector3(-tangent.y, tangent.x, 0);

    const pts = [
      new THREE.Vector3(point.x + normal.x * halfW, point.y + normal.y * halfW, 0.02),
      new THREE.Vector3(point.x - normal.x * halfW, point.y - normal.y * halfW, 0.02),
    ];

    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geom, new THREE.LineBasicMaterial({
      color: SECTOR_EMISSIVE[idx],
      transparent: true,
      opacity: 0.8,
      linewidth: 2,
    }));
    group.add(line);
  });

  return group;
}

/**
 * Create corner number labels as sprite text.
 */
function createCornerLabels(curve, numCorners = 0) {
  if (numCorners <= 0) return new THREE.Group();

  const group = new THREE.Group();
  const trackPoints = curve.getSpacedPoints(TRACK_RESOLUTION);

  // Detect corners by finding points of high curvature
  const curvatures = [];
  for (let i = 0; i < trackPoints.length; i++) {
    const prev = trackPoints[(i - 3 + trackPoints.length) % trackPoints.length];
    const curr = trackPoints[i];
    const next = trackPoints[(i + 3) % trackPoints.length];

    const v1 = new THREE.Vector3().subVectors(curr, prev);
    const v2 = new THREE.Vector3().subVectors(next, curr);
    const angle = v1.angleTo(v2);
    const crossZ = v1.x * v2.y - v1.y * v2.x;
    curvatures.push({ index: i, curvature: angle, point: curr, isLeftTurn: crossZ > 0 });
  }

  // Sort by curvature and pick top N
  curvatures.sort((a, b) => b.curvature - a.curvature);

  // Filter to ensure labels aren't too close together (minimum 15 points apart)
  const selectedCorners = [];
  for (const c of curvatures) {
    if (selectedCorners.length >= numCorners) break;
    const tooClose = selectedCorners.some(s =>
      Math.abs(s.index - c.index) < 15 ||
      Math.abs(s.index - c.index) > trackPoints.length - 15
    );
    if (!tooClose && c.curvature > 0.02) {
      selectedCorners.push(c);
    }
  }

  // Sort by track position
  selectedCorners.sort((a, b) => a.index - b.index);

  selectedCorners.forEach((corner, idx) => {
    let tangent = curve.getTangentAt(corner.index / TRACK_RESOLUTION);
    if (tangent.lengthSq() < 0.000001) tangent = new THREE.Vector3(1, 0, 0);
    else tangent.normalize();
    
    const normal = new THREE.Vector3(-tangent.y, tangent.x, 0);
    // Standard normal points left of the tangent. For a left turn, this points INSIDE.
    // We want the label/cone on the OUTSIDE of the turn, so we flip it for left turns.
    if (corner.isLeftTurn) {
      normal.multiplyScalar(-1);
    }
    const labelOffset = TRACK_WIDTH * 2.0; // Moved further out for visibility
    const coneOffset = TRACK_WIDTH * 1.4; // Moved further out to keep off track

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, 64, 64);
    ctx.font = "bold 36px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(`${idx + 1}`, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(
      corner.point.x + normal.x * labelOffset,
      corner.point.y + normal.y * labelOffset,
      0.8, // Lowered to 0.8 so it's perfectly in the FOV of the halo camera
    );
    sprite.scale.set(1.0, 1.0, 1); // slightly smaller scale to match being closer
    group.add(sprite);

    // Create a small cone pointing at the corner
    const coneGeom = new THREE.ConeGeometry(TRACK_WIDTH * 0.15, TRACK_WIDTH * 0.4, 8);
    const coneMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee, transparent: true, opacity: 0.9 });
    const cone = new THREE.Mesh(coneGeom, coneMat);
    
    cone.position.set(
      corner.point.x + normal.x * coneOffset,
      corner.point.y + normal.y * coneOffset,
      0.05 // Hover just slightly above track to avoid clipping
    );
    
    // Mathematically perfect orientation for a 2D plane:
    // Set the up vector to +Z to prevent gimbal lock on XY plane targets
    cone.up.set(0, 0, 1);
    cone.lookAt(corner.point.x, corner.point.y, 0.05);
    // Rotate the cone's tip (+Y) by 90 degrees so it perfectly points TOWARDS the target
    cone.rotateX(Math.PI / 2);
    
    group.add(cone);
  });

  return group;
}

/**
 * Create dynamic alternating red/white kerbs at the apex of corners.
 */
function createApexKerbs(curve, trackWidth) {
  const group = new THREE.Group();
  const trackPoints = curve.getSpacedPoints(TRACK_RESOLUTION);

  const curvatures = [];
  for (let i = 0; i < trackPoints.length; i++) {
    const prev = trackPoints[(i - 3 + trackPoints.length) % trackPoints.length];
    const curr = trackPoints[i];
    const next = trackPoints[(i + 3) % trackPoints.length];

    const v1 = new THREE.Vector3().subVectors(curr, prev);
    const v2 = new THREE.Vector3().subVectors(next, curr);
    const angle = v1.angleTo(v2);
    const crossZ = v1.x * v2.y - v1.y * v2.x;
    curvatures.push({ index: i, curvature: angle, point: curr, isLeftTurn: crossZ > 0 });
  }

  const smoothed = [];
  for (let i = 0; i < trackPoints.length; i++) {
     let sum = 0;
     for (let j = -2; j <= 2; j++) {
        sum += curvatures[(i + j + trackPoints.length) % trackPoints.length].curvature;
     }
     smoothed.push(sum / 5);
  }

  const kerbWidth = 0.08;
  const kerbLength = 0.15;
  const halfW = trackWidth / 2;
  
  const redBlocks = [];
  const whiteBlocks = [];

  let blockCounter = 0;
  for (let i = 0; i < trackPoints.length; i++) {
    // If curvature is high enough, it's a corner -> add apex kerbs on the inside
    if (smoothed[i] > 0.015) { 
      let tangent = curve.getTangentAt(i / TRACK_RESOLUTION);
      if (tangent.lengthSq() < 0.000001) tangent = new THREE.Vector3(1, 0, 0);
      else tangent.normalize();
      
      const normal = new THREE.Vector3(-tangent.y, tangent.x, 0);
      const isLeftTurn = curvatures[i].isLeftTurn;
      
      // Apex kerb is on the INSIDE of the corner
      let side = isLeftTurn ? 1 : -1; 
      
      const pos = trackPoints[i].clone().add(normal.clone().multiplyScalar(side * (halfW + kerbWidth/2)));
      
      const matrix = new THREE.Matrix4();
      const quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.atan2(tangent.y, tangent.x));
      const scale = new THREE.Vector3(kerbLength, kerbWidth, 0.02); 
      matrix.compose(new THREE.Vector3(pos.x, pos.y, 0.01), quaternion, scale);
      
      if (Math.floor(blockCounter / 2) % 2 === 0) { 
         redBlocks.push(matrix);
      } else {
         whiteBlocks.push(matrix);
      }
      blockCounter++;
    } else {
      blockCounter = 0;
    }
  }

  const boxGeom = new THREE.BoxGeometry(1, 1, 1);
  if (redBlocks.length > 0) {
    const redMesh = new THREE.InstancedMesh(boxGeom, new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.8 }), redBlocks.length);
    for (let i=0; i<redBlocks.length; i++) redMesh.setMatrixAt(i, redBlocks[i]);
    group.add(redMesh);
  }
  if (whiteBlocks.length > 0) {
    const whiteMesh = new THREE.InstancedMesh(boxGeom, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), whiteBlocks.length);
    for (let i=0; i<whiteBlocks.length; i++) whiteMesh.setMatrixAt(i, whiteBlocks[i]);
    group.add(whiteMesh);
  }

  return group;
}

// ─── Corner count per circuit (approximate, for labeling) ────────────
const CORNER_COUNTS = {
  albert_park: 14, americas: 20, bahrain: 15, baku: 20,
  catalunya: 16, hungaroring: 14, imola: 19, interlagos: 15,
  jeddah: 27, losail: 16, marina_bay: 23, miami: 19,
  monaco: 19, monza: 11, red_bull_ring: 10, rodriguez: 17,
  shanghai: 16, silverstone: 18, spa: 19, suzuka: 18,
  vegas: 17, villeneuve: 14, yas_marina: 16, zandvoort: 14,
};

// ─── Main Export ─────────────────────────────────────────────────────

// ─── Main Export ─────────────────────────────────────────────────────

/**
 * Build a complete procedural track scene from GPS reference data.
 *
 * @param {Array<{x: number, y: number}>} rawGPSPoints - Raw GPS coordinates (unscaled)
 * @param {string} [circuitId] - Circuit identifier for corner count lookup
 * @returns {{ group: THREE.Group, curve: CatmullRomCurve3, center: Vector2, scale: number } | null}
 */
export function buildTrackFromGPS(rawGPSPoints, circuitId) {
  let sectorBounds = [0.333, 0.666];
  if (circuitId && sectorBoundaries[circuitId]) {
    sectorBounds = sectorBoundaries[circuitId];
    console.log(`[TrackBuilder] Using true sector bounds for ${circuitId}: ${sectorBounds}`);
  }

  const normalized = normalizeGPSPoints(rawGPSPoints, 18);
  if (!normalized) {
    console.warn("[TrackBuilder] Insufficient GPS data for track generation");
    return { group: new THREE.Group(), curve: null, center: new THREE.Vector2(0, 0), scale: 1 };
  }

  const { points, center, scale } = normalized;
  const curve = buildSpline(points);
  const group = new THREE.Group();

  // 1. Ground plane (dark asphalt-like surface beneath track)
  const ground = createGroundPlane(curve, RUNOFF_WIDTH);
  ground.name = "TrackGround";
  group.add(ground);

  // 2. Track surface with sector coloring
  const trackGeom = createRibbonGeometry(curve, TRACK_WIDTH, TRACK_RESOLUTION, SECTOR_COLORS, sectorBounds);
  const trackMesh = new THREE.Mesh(trackGeom, new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.7,
    metalness: 0.1,
    side: THREE.DoubleSide,
  }));
  trackMesh.name = "TrackSurface";
  group.add(trackMesh);

  // 3. Track edge lines (kerbs with sector glow)
  const [leftEdge, rightEdge] = createEdgeLines(curve, TRACK_WIDTH, TRACK_RESOLUTION);
  leftEdge.name = "LeftEdge";
  rightEdge.name = "RightEdge";
  group.add(leftEdge, rightEdge);

  // 4. Center dashed line
  const centerLine = createCenterLine(curve, TRACK_RESOLUTION);
  centerLine.name = "CenterLine";
  centerLine.computeLineDistances();
  group.add(centerLine);

  // 5. Start/finish line
  const startFinish = createStartFinishLine(curve, TRACK_WIDTH);
  startFinish.name = "StartFinish";
  group.add(startFinish);

  // 6. Sector boundary markers
  const sectorMarkers = createSectorMarkers(curve, TRACK_WIDTH);
  sectorMarkers.name = "SectorMarkers";
  group.add(sectorMarkers);

  // 7. Grandstands (Main Straight)
  const grandstands = createProceduralGrandstands(curve, TRACK_WIDTH);
  grandstands.name = "Grandstands";
  group.add(grandstands);

  // 7.5 Apex Kerbs
  const kerbs = createApexKerbs(curve, TRACK_WIDTH);
  kerbs.name = "Kerbs";
  group.add(kerbs);

  // 8. Corner labels
  const numCorners = CORNER_COUNTS[circuitId] || 14;
  const cornerLabels = createCornerLabels(curve, numCorners);
  cornerLabels.name = "CornerLabels";
  group.add(cornerLabels);

  // 8.5 Trees
  const trees = createTrees(curve, TRACK_WIDTH, RUNOFF_WIDTH);
  trees.name = "Trees";
  group.add(trees);

  console.log(`[TrackBuilder] Procedural track built: ${points.length} control points, ${numCorners} corners`);

  return { group, curve, center, scale };
}

/**
 * Convert a raw telemetry point (x,y) into 3D scene coordinates
 * using the calibration values returned from buildTrackFromGPS.
 */
export function telemetryToScene(x, y, center, scale) {
  if (!center || !scale) return new THREE.Vector3(x, y, 0);
  return new THREE.Vector3((x - center.x) * scale, (y - center.y) * scale, 0);
}

/**
 * Dynamically updates the color of the track ribbon based on the selected mode.
 * Modes: "sectors" (Red/Blue/Gold) or "heatmap" (Curvature-based Speed Heatmap)
 */
export function updateTrackColors(trackGroup, curve, sectorBounds = [0.333, 0.666], colorMode = "sectors") {
  if (!trackGroup || !curve) return;
  const trackMesh = trackGroup.getObjectByName("TrackSurface");
  if (!trackMesh) return;

  const points = curve.getSpacedPoints(TRACK_RESOLUTION);
  const colors = [];

  const curvatures = [];
  let maxCurvature = 0;
  if (colorMode === "heatmap") {
    // Calculate curvature at each point to map to speed
    for (let i = 0; i < points.length; i++) {
      const prev = points[(i - 3 + points.length) % points.length];
      const curr = points[i];
      const next = points[(i + 3) % points.length];
      const v1 = new THREE.Vector3().subVectors(curr, prev);
      const v2 = new THREE.Vector3().subVectors(next, curr);
      let angle = 0;
      if (v1.lengthSq() > 0 && v2.lengthSq() > 0) {
        angle = v1.angleTo(v2);
      }
      curvatures.push(angle);
      if (angle > maxCurvature) maxCurvature = angle;
    }
  }

  for (let i = 0; i < points.length; i++) {
    let col = new THREE.Color();
    
    if (colorMode === "heatmap") {
      // High curvature = sharp corner = RED (Slow)
      // Low curvature = straight = GREEN (Fast)
      // We clamp the max curvature to roughly 0.6 so the tightest corners show up as deep red
      const normalizedCurvature = Math.min(1.0, curvatures[i] / (Math.min(maxCurvature, 0.6) + 0.001));
      const speed = 1.0 - normalizedCurvature;
      
      // HSL: Hue 0 (Red) to 0.33 (Green)
      col.setHSL(speed * 0.33, 1.0, 0.5);
    } else {
      // Sector Mode
      const progress = i / points.length;
      let sectorIdx = 2; 
      if (progress < sectorBounds[0]) sectorIdx = 0;
      else if (progress < sectorBounds[1]) sectorIdx = 1;
      col = SECTOR_COLORS[sectorIdx];
    }
    
    // 2 vertices per track segment cross-section (Left and Right)
    colors.push(col.r, col.g, col.b);
    colors.push(col.r, col.g, col.b);
  }

  trackMesh.geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  trackMesh.geometry.attributes.color.needsUpdate = true;
}



/**
 * Procedurally generates grandstands along the main straight.
 */
function createProceduralGrandstands(curve, trackWidth) {
  const group = new THREE.Group();
  
  // Create a few grandstand blocks along the main straight (u = 0.02 to 0.1)
  const numBlocks = 4;
  const startU = 0.01;
  const endU = 0.06;
  
  const standMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.9,
    metalness: 0.1
  });
  
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0xcc0000, // Red accent
    roughness: 0.6
  });

  const trackPoints = curve.getSpacedPoints(200);

  for (let i = 0; i < numBlocks; i++) {
    const u = startU + (i / numBlocks) * (endU - startU);
    const point = curve.getPointAt(u);
    let tangent = curve.getTangentAt(u);
    if (tangent.lengthSq() < 0.000001) {
      tangent = new THREE.Vector3(1, 0, 0);
    } else {
      tangent.normalize();
    }
    
    // Calculate normal (perpendicular to track)
    const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
    const offsetDist = trackWidth + 0.5; 
    
    // Check both sides of the track
    const pos1 = point.clone().add(normal.clone().multiplyScalar(offsetDist));
    const pos2 = point.clone().add(normal.clone().multiplyScalar(-offsetDist));
    
    // Find min distance to track for pos1 and pos2 (excluding the immediate straight)
    let minD1 = Infinity;
    let minD2 = Infinity;
    
    for (let j = 0; j < trackPoints.length; j++) {
      const tp = trackPoints[j];
      const tpU = j / trackPoints.length;
      // if it's part of the main straight, ignore it for collision
      if (Math.abs(tpU - u) < 0.15 || Math.abs(tpU - u) > 0.85) continue; 
      
      const d1 = pos1.distanceToSquared(tp);
      if (d1 < minD1) minD1 = d1;
      
      const d2 = pos2.distanceToSquared(tp);
      if (d2 < minD2) minD2 = d2;
    }
    
    // Square of 1.2 clearance is 1.44.
    let bestPos = null;
    let bestSide = 1;
    
    if (minD1 > 1.44 && minD1 >= minD2) {
      bestPos = pos1;
      bestSide = 1;
    } else if (minD2 > 1.44) {
      bestPos = pos2;
      bestSide = -1;
    }
    
    // Skip if no room on either side
    if (!bestPos) continue; 
    
    // Create tiered seating (3 tiers)
    const standGroup = new THREE.Group();
    const tiers = 4;
    const tierWidth = 0.2; // Scaled down
    const tierHeight = 0.1; // Scaled down
    const blockLength = 1.2; // Scaled down
    
    for (let t = 0; t < tiers; t++) {
      const geom = new THREE.BoxGeometry(tierWidth, blockLength, tierHeight);
      const mesh = new THREE.Mesh(geom, t === tiers - 1 ? accentMaterial : standMaterial);
      
      // Shift back and up for each tier (always positive X locally)
      mesh.position.set(t * tierWidth, 0, (t * tierHeight) / 2 + 0.05);
      standGroup.add(mesh);
    }
    
    // Roof
    const roofGeom = new THREE.BoxGeometry(tiers * tierWidth + 0.2, blockLength, 0.02);
    const roof = new THREE.Mesh(roofGeom, standMaterial);
    roof.position.set((tiers * tierWidth) / 2 - 0.1, 0, tiers * tierHeight + 0.1);
    // Slight roof tilt
    roof.rotation.y = 0.1;
    standGroup.add(roof);

    // Position the whole stand block
    standGroup.position.copy(bestPos);
    
    // Rotate to face track
    let angle = Math.atan2(normal.y, normal.x);
    if (bestSide === -1) {
        angle += Math.PI; // Flip 180 degrees so it faces the track from the inside
    }
    standGroup.rotation.set(0, 0, angle);

    group.add(standGroup);
  }
  
  return group;
}

/**
 * Procedurally generates scattered low-poly trees along the edge of the runoff area.
 */
function createTrees(curve, trackWidth, runoffWidth) {
  const group = new THREE.Group();
  
  // Using InstancedMesh for performance
  const numTrees = 350;
  
  const treeGeom = new THREE.ConeGeometry(0.12, 0.4, 5); // Low poly pine tree
  const treeMat = new THREE.MeshStandardMaterial({ 
    color: 0x1b4d1c, // Pine green
    roughness: 0.9,
    metalness: 0.0
  });
  
  const mesh = new THREE.InstancedMesh(treeGeom, treeMat, numTrees);
  const dummy = new THREE.Object3D();
  
  const trackPoints = curve.getSpacedPoints(200); // Coarse points for distance checking
  const validTrees = [];
  let attempts = 0;
  const minSafeDistSq = runoffWidth * runoffWidth;
  
  // Keep trying until we get enough trees or hit the limit
  while (validTrees.length < numTrees && attempts < 5000) {
    attempts++;
    const u = Math.random();
    const point = curve.getPointAt(u);
    let tangent = curve.getTangentAt(u);
    if (tangent.lengthSq() < 0.000001) {
      tangent = new THREE.Vector3(1, 0, 0);
    } else {
      tangent.normalize();
    }
    const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
    
    const side = Math.random() > 0.5 ? 1 : -1;
    // Buffer pushes them off the asphalt edge
    const offset = runoffWidth + 0.15 + (Math.random() * 0.3);
    const treePos = point.clone().add(normal.clone().multiplyScalar(side * offset));
    
    // Validate: ensure it is not on the black runoff of ANY other track segment
    let isValid = true;
    for (let j = 0; j < trackPoints.length; j++) {
      const tp = trackPoints[j];
      const dx = treePos.x - tp.x;
      const dy = treePos.y - tp.y;
      if (dx * dx + dy * dy < minSafeDistSq) {
        isValid = false;
        break;
      }
    }
    
    if (isValid) {
      validTrees.push(treePos);
    }
  }
  
  // Adjust actual InstancedMesh count to how many valid trees we found
  mesh.count = validTrees.length;
  
  for (let i = 0; i < validTrees.length; i++) {
    const treePos = validTrees[i];
    // Scale up the trees so they are proportional to the track width (15m track vs 20m tree)
    const scale = 1.5 + Math.random() * 1.5;
    
    // Base of cone is in the middle of its height, so raise by height/2 * scale
    // height is 0.4, so half-height is 0.2
    dummy.position.set(treePos.x, treePos.y, 0.2 * scale);
    
    // Rotate so tip (+Y) points UP (+Z)
    dummy.rotation.x = Math.PI / 2;
    // Random spin around its own vertical axis for variety
    dummy.rotation.y = Math.random() * Math.PI;
    
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
  return group;
}
