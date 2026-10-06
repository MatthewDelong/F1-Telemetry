import React, { useLayoutEffect, useRef, useState } from "react";
import classNames from "classnames";
import "./SeasonTimeline.scss";

const NodeImage = ({ src }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <img
      className="season-timeline__image"
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
};

/**
 * Horizontal timeline of selectable nodes (seasons, special editions…).
 * entries: [{ key, label, sublabel?, image? }]
 */
export const SeasonTimeline = ({
  entries = [],
  selectedKey,
  onSelect,
  color,
  ariaLabel = "Timeline",
  className,
  startAtEnd = false,
}) => {
  const scrollRef = useRef(null);
  const signature = entries.map((entry) => entry.key).join("|");

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (startAtEnd && el) el.scrollLeft = el.scrollWidth;
  }, [signature, startAtEnd]);

  if (!entries.length) return null;

  return (
    <div
      ref={scrollRef}
      className={classNames("season-timeline", className)}
      style={color ? { "--timeline-color": color } : undefined}
    >
      <div className="season-timeline__track" role="tablist" aria-label={ariaLabel}>
        {entries.map((entry) => {
          const active = String(entry.key) === String(selectedKey);
          return (
            <button
              key={entry.key}
              id={`timeline-node-${String(entry.key).replace(/\s+/g, "-")}`}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect?.(entry.key)}
              className={classNames("season-timeline__node", {
                "season-timeline__node--active": active,
              })}
            >
              <NodeImage src={entry.image} />
              {entry.sublabel && (
                <span className="season-timeline__sublabel">{entry.sublabel}</span>
              )}
              <span className="season-timeline__label">{entry.label}</span>
              <span className="season-timeline__dot" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SeasonTimeline;
