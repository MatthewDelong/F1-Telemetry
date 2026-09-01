import React, { useEffect, useMemo, useRef, useState } from "react";
import classNames from "classnames";
import "./Tabs.scss";

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

    useEffect(() => {
        const activeBtn = tabListRef.current?.querySelector(
            `button[data-tab-id="${activeTabId}"]`
        );
        if (activeBtn) {
            setIndicatorStyle({
                width: activeBtn.offsetWidth,
                left: activeBtn.offsetLeft,
            });
        }
    }, [activeTabId, visibleTabs]);

    if (!visibleTabs.length) return null;

    const activeTab =
        visibleTabs.find((tab) => tab.id === activeTabId) || visibleTabs[0];

    return (
        <div className={classNames("glass-tabs", className)}>
            <div
                ref={tabListRef}
                className={classNames(
                    "glass-tab-list no-scrollbar",
                    tabListClassName
                )}
                role="tablist"
            >
                {visibleTabs.map((tab) => (
                    <button
                        key={tab.id}
                        data-tab-id={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={tab.id === activeTab.id}
                        className={classNames(
                            "glass-tab-btn",
                            tab.id === activeTab.id ? "active" : ""
                        )}
                        onClick={() => setActiveTabId(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
                <div
                    className="glass-tab-indicator"
                    style={indicatorStyle}
                />
            </div>
            <div className={classNames("mt-4", panelClassName)}>{activeTab.content}</div>
        </div>
    );
};
