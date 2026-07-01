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

## 🏟️ Phase 3: Visual Polish & Models (IN PROGRESS)
*   **Procedural Grandstands**: Added a `createProceduralGrandstands` function to `TrackBuilder.js`. It dynamically calculates the track's normal vector on the main straight and spawns tiered 3D grandstand geometry.
*   **Responsive Scaling**: Adjusted the scale of the grandstands to match the width of the track ribbon perfectly. Since they are procedurally calculated, they will automatically fit perfectly on any circuit from Monaco to Silverstone!
*   **Next Steps**: Further UI polish, potentially more procedural scenery (trees/curbs), or specific sector speed mapping.
