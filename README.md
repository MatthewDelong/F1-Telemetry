# F1-Telemetry

Welcome to **F1-Telemetry**! This project is dedicated to providing Formula 1 enthusiasts with detailed analyses of past race data, including leaderboards, lap times, tire strategies, and the fastest laps for each driver. Explore an interactive 3D canvas that lets you visualize the telemetry data of selected F1 drivers, tracing their performance on the track lap by lap with high-fidelity telemetry sync and dynamic camera angles.

![F1-Telemetry Animation](/Media/animation-grid_1.gif)
![F1-Telemetry Visualization](/images/HeroImage.png)

## Features

**F1-Telemetry** offers several exciting features:

- **Detailed Leaderboards:** Get comprehensive rankings and statistics from previous races.
- **Lap Times Analysis:** Dive into lap-by-lap performance metrics to study consistency and strategy.
- **Tire Strategies:** Understand how different tire choices play out during a race.
- **Fastest Laps:** Discover which drivers achieved the fastest laps during each event.
- **Interactive AR Viewer:** Experience high-fidelity 3D car models with **Draco/Meshopt** compression for ultra-fast loading (shrunk from 90MB to 23MB).
- **Interactive Telemetry Viewer:** Follow your favorite drivers' telemetry data with synchronized 3D visualization and professional broadcast-style framing.

## Developer Workflow

### AR Model Optimization
This project uses a custom pipeline to optimize massive 3D models for the web. If you add new `.glb` files to `public/ArFiles/glbs/`, you can optimize them using:

```powershell
npm run compress-models
```
*Requires PowerShell and Node.js.*

### Local Decoders
To bypass browser **Tracking Prevention** and ensure 100% reliability, Draco and Meshopt decoders are hosted locally in `/public/decoders/`.

## Deployment (IONOS / Static Hosting)

For optimal performance on IONOS or similar hosts:
1. Ensure the `.htaccess` file in `public/` is deployed to the root to enable **Gzip compression** for `.glb` files.
2. Verify the `public/decoders/` folder is included in your build to avoid cross-domain script blocking.

## Interactive Canvas
... (rest of the file as before)

Our interactive canvas is a standout feature, offering users a real-time simulation of telemetry data. This tool allows fans to:

- Select a driver and watch their race unfold lap by lap.
- Switch between multiple camera views to get a closer look at race strategies and driver skills.
- Analyze detailed representations of speed, gear, and track position per driver.

## Notice

Please note that **F1-Telemetry** is an unofficial project and is not associated in any way with the Formula 1 companies. F1, FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD CHAMPIONSHIP, GRAND PRIX, and related marks are trademarks of Formula One Licensing B.V.

## Website

For more information and to access the interactive features, visit:
[F1-Telemetry](https://f1-telemetry.matthews-world.co.uk/)

## Data Sources

F1-Telemetry leverages a multi-tier data ecosystem to provide high-fidelity race insights:

- **OpenF1 API:** Real-time telemetry, track positioning, and stint data.
- **F1-Telemetry Historical Engine:** Historical race results, driver rankings, and seasonal standings.
- **F1 Academy & F2 API:** Dedicated data streams for junior categories.

## Support and Contribution

Contributions to F1-Telemetry are always welcome! Whether it's improving the codebase, adding new features, or fixing bugs, please feel free to fork the repository and submit a pull request.

## License

This project is licensed under our custom license.

## Contact

For any questions or suggestions, please visit our discussion boards.

Enjoy exploring the data and insights at **F1-Telemetry**!
