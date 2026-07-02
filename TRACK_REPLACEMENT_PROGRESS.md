# 🏎️ Track Rendering: Blender Replacement Progress

This document tracks the implementation of the procedural Three.js track rendering strategy, which replaces the legacy Blender-based `.gltf` models and `.mp4` video files.

## 🏁 Phase 1: Track Builder Core (COMPLETE)
*   **Procedural Generation**: Created `src/utils/TrackBuilder.js` to take raw F1 telemetry coordinates (x, y) and generate a smooth `CatmullRomCurve3`.
*   **Track Elements**: The builder dynamically generates:
    *   The track ribbon (colored dynamically into 3 sectors).
    *   Kerbs/edges (left and right lines).
    *   A center dashed racing line.
    *   The start/finish checkered line.
    *   Procedural corner number labels mapped evenly around the spline.
*   **Asset Removal**: All legacy `.gltf` and `.bin` files were deleted from `public/maps/`.

## 🌍 Phase 2: 360° Preview (COMPLETE)
*   **Real-time Orbit**: Replaced the static `<video>` element with a fully procedural rotating camera view in `ThreeCanvas.jsx`.
*   **Asset Removal**: All 20 `.mp4` files (70MB+) were permanently deleted from `public/mapsAnimated/`. The app now generates orbit previews for *every* track perfectly.

## ⚡ Data Infrastructure & Anti-Rate Limiting (COMPLETE)
*   **The 429 Penalty Fix**: We initially hit OpenF1 API "Too Many Requests" (429) rate limits because downloading the track location shape on-the-fly was too heavy.
*   **Track Downloader Script**: Wrote `scripts/downloadAllTracks.js` to slowly scrape the location data for a perfect lap from all 24 tracks on the calendar.
*   **JSON Caching**: All tracks are now saved locally in `public/trackdata/*.json`. The frontend (`api.js`) automatically loads the track geometry from these local JSON files *before* checking the API. This guarantees instant track loading and zero API rate-limit risk.
*   **Formatting**: Wrote `scripts/format.py` to pretty-print the JSON files so they are readable.

## 🏟️ Phase 3: Visual Polish & Models (COMPLETE)
*   **Procedural Grandstands**: Added a `createProceduralGrandstands` function to `TrackBuilder.js`. It dynamically calculates the track's normal vector on the main straight and spawns tiered 3D grandstand geometry that perfectly scales to match the track width.
*   **Procedural Forests**: Created a high-performance `InstancedMesh` of low-poly pine trees that mathematically calculates the outermost bounds of the black runoff area and seamlessly frames the circuit without ever overlapping the asphalt.
*   **Corner Cones & Labels**: Added procedurally placed directional cones that point directly at the corner apexes, and 3D floating sprite numbers to indicate corner indices. These are perfectly aligned for both top-down and low-angle Halo camera views.
*   **Landing Page MiniViewer**: Upgraded the `MiniTrackViewer.jsx` on the landing page to feature a 72-degree 3D tilt, perfectly mapped neon sector coloring (Red, Blue, Gold), and a slow turntable rotation effect.
*   **Z-Axis Grounding**: Perfectly aligned the track surface, car models, and dynamic telemetry racing lines so they seamlessly hug the ground plane without floating or z-fighting.

## 🚀 Next Steps
*   **Sector Speed Mapping**: Visually represent varying car speeds or telemetry data dynamically along the track ribbon.
*   **UI Polish**: Further refinements to the dashboard and camera controls for maximum immersion.
*   **Performance Optimization**: Review geometry counts and materials to ensure a smooth 60fps experience across all devices.
