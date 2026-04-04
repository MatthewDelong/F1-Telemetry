import classNames from "classnames";
import React, { useEffect, useRef, useState } from "react";

const PngSequencePlayer = ({
  frameCount,
  path,
  fileExtension = "png",
  frameRate = 30,
  className,
  canvasClasses,
  loadingImage,
}) => {
  const canvasRef = useRef(null);
  const [images, setImages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const [loadingStarted, setLoadingStarted] = useState(false);

  // Load the first image immediately as a placeholder
  useEffect(() => {
    const firstImg = new Image();
    firstImg.src = `${path}${String(0).padStart(5, "0")}.${fileExtension}`;
    firstImg.onload = () => {
      if (images.length === 0) {
        setImages([firstImg]);
      }
    };
  }, [path, fileExtension]);

  // Use IntersectionObserver to start full loading when in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) {
          setLoadingStarted(true);
        }
      },
      { threshold: 0.1 } // Start loading when 10% is visible
    );

    if (canvasRef.current) {
      observer.observe(canvasRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Batched loading
  useEffect(() => {
    if (!loadingStarted) return;

    let isCancelled = false;
    const batchSize = 10;
    const allLoadedImages = new Array(frameCount);

    const loadImage = (index) =>
      new Promise((resolve) => {
        const img = new Image();
        img.src = `${path}${String(index).padStart(5, "0")}.${fileExtension}`;
        img.onload = () => resolve(img);
        img.onerror = () => {
          console.error(`Error loading image: ${img.src}`);
          resolve(null);
        };
      });

    const loadInBatches = async () => {
      for (let i = 0; i < frameCount; i += batchSize) {
        if (isCancelled) break;
        
        const batch = [];
        for (let j = i; j < i + batchSize && j < frameCount; j++) {
          batch.push(loadImage(j).then(img => ({ index: j, img })));
        }
        
        const results = await Promise.all(batch);
        results.forEach(({ index, img }) => {
          if (img) allLoadedImages[index] = img;
        });

        // Provide partial updates to show progress
        if (i === 0 || i + batchSize >= frameCount) {
          const validImages = allLoadedImages.filter(Boolean);
          if (validImages.length > 0) {
            setImages([...validImages]);
            if (i + batchSize >= frameCount) setLoaded(true);
          }
        }
      }
    };

    loadInBatches();

    return () => {
      isCancelled = true;
    };
  }, [loadingStarted, frameCount, path, fileExtension]);

  // Play animation only if in view and images are loaded
  useEffect(() => {
    if (!inView || !loaded || images.length === 0 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const msPerFrame = 1000 / Math.max(1, frameRate);

    let currentFrame = 0;
    let animationFrameId;
    let previousTimestamp = 0;

    const update = (timestamp) => {
      if (!previousTimestamp) previousTimestamp = timestamp;
      const elapsed = timestamp - previousTimestamp;

      if (ctx && images[currentFrame]) {
        canvas.width = images[0].width;
        canvas.height = images[0].height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(images[currentFrame], 0, 0, canvas.width, canvas.height);
      }

      if (elapsed >= msPerFrame) {
        currentFrame = (currentFrame + 1) % frameCount;
        previousTimestamp = timestamp;
      }

      animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update); // Start animation immediately when in view

    return () => cancelAnimationFrame(animationFrameId); // Clean up animation when the component unmounts or goes out of view
  }, [inView, loaded, images, frameCount, frameRate]);

  return (
    <div className={classNames(className, "png-sequence-player flex justify-center items-center")}>
      {!loaded && <img className={classNames(canvasClasses, "png-sequence-player__image")} src={loadingImage} alt="Loading..." />}
      <canvas ref={canvasRef} className={classNames(canvasClasses, !loaded ? "hidden" : "", "png-sequence-player__canvas")} />      
    </div>
  );
};

export default PngSequencePlayer;
