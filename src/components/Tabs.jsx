import React, { useEffect, useMemo, useRef, useState } from "react";
import classNames from "classnames";

export const Tabs = ({
    tabs = [],
    className,
    tabListClassName,
    panelClassName,
}) => {
    const visibleTabs = useMemo(
        () => tabs.filter((tab) => tab && tab.id && tab.label),
        [tabs]
    );
    const [activeTabId, setActiveTabId] = useState(visibleTabs[0]?.id || "");
    const tabListRef = useRef(null);
    const [indicatorStyle, setIndicatorStyle] = useState({});

    useEffect(() => {
        if (!visibleTabs.length) {
            setActiveTabId("");
            return;
        }

        const activeTabStillVisible = visibleTabs.some(
            (tab) => tab.id === activeTabId
        );
        if (!activeTabStillVisible) {
            setActiveTabId(visibleTabs[0].id);
        }
    }, [activeTabId, visibleTabs]);

    // Animate underline indicator position
    useEffect(() => {
        if (!tabListRef.current) return;
        const activeBtn = tabListRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
        if (activeBtn) {
            const listRect = tabListRef.current.getBoundingClientRect();
            const btnRect = activeBtn.getBoundingClientRect();
            setIndicatorStyle({
                left: btnRect.left - listRect.left,
                width: btnRect.width,
            });
        }
    }, [activeTabId, visibleTabs]);

    if (!visibleTabs.length) return null;

    const activeTab =
        visibleTabs.find((tab) => tab.id === activeTabId) || visibleTabs[0];

    return (
        <div className={classNames("", className)}>
            <div
                ref={tabListRef}
                className={classNames(
                    "relative flex overflow-x-auto no-scrollbar",
                    tabListClassName
                )}
                role="tablist"
                style={{ gap: "0.2rem" }}
            >
                {visibleTabs.map((tab) => (
                    <button
                        key={tab.id}
                        data-tab-id={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={tab.id === activeTab.id}
                        className={classNames(
                            "relative px-16 py-6 text-xs tracking-xs uppercase transition-all duration-300 whitespace-nowrap font-display",
                            "border-b-2 border-transparent",
                            tab.id === activeTab.id
                                ? "text-white"
                                : "text-neutral-500 hover:text-neutral-300"
                        )}
                        onClick={() => setActiveTabId(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}

                {/* Animated underline indicator */}
                <div
                    className="absolute bottom-0 h-[2px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                    style={{
                        left: indicatorStyle.left ?? 0,
                        width: indicatorStyle.width ?? 0,
                        background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
                        boxShadow: "0 0 12px rgba(59, 130, 246, 0.4), 0 0 4px rgba(59, 130, 246, 0.2)",
                        borderRadius: "1px",
                    }}
                />

                {/* Bottom border line */}
                <div
                    className="absolute bottom-0 left-0 w-full h-[1px]"
                    style={{
                        background: "rgba(255, 255, 255, 0.06)",
                    }}
                />
            </div>
            <div className={classNames("mt-20", panelClassName)}>
                {activeTab.content}
            </div>
        </div>
    );
};
