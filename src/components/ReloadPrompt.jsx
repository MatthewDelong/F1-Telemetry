import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import './ReloadPrompt.css';

function ReloadPrompt() {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            if (r) {
                console.log('SW Registered:', r);
                // Check for updates every hour
                setInterval(() => {
                    r.update();
                }, 60 * 60 * 1000);
            }
        },
        onRegisterError(error) {
            console.error('SW Registration Error:', error);
        },
    });

    React.useEffect(() => {
        console.log('PWA Status - offlineReady:', offlineReady, 'needRefresh:', needRefresh);
    }, [offlineReady, needRefresh]);

    const handleReload = async () => {
        // Manual cache clearing to ensure a fresh fetch and resolve "previous version" issues
        if ('caches' in window) {
            try {
                const names = await caches.keys();
                await Promise.all(names.map(name => caches.delete(name)));
            } catch (err) {
                console.error('Error clearing caches:', err);
            }
        }
        updateServiceWorker(true);
    };

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    return (
        <div className="ReloadPrompt-container">
            {(offlineReady || needRefresh) && (
                <div className="ReloadPrompt-toast">
                    <div className="ReloadPrompt-message">
                        {needRefresh ? (
                            <span>New content available, click on reload button to update.</span>
                        ) : (
                            <span>App ready to work offline</span>
                        )}
                    </div>
                    {needRefresh && (
                        <button className="ReloadPrompt-toast-button" onClick={handleReload}>
                            Reload
                        </button>
                    )}
                    <button className="ReloadPrompt-toast-button" onClick={close}>
                        Close
                    </button>
                </div>
            )}
        </div>
    );
}

export default ReloadPrompt;
