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
            console.log('SW Registered:', r);
        },
        onRegisterError(error) {
            console.error('SW Registration Error:', error);
        },
    });

    React.useEffect(() => {
        console.log('PWA Status - offlineReady:', offlineReady, 'needRefresh:', needRefresh);
    }, [offlineReady, needRefresh]);

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
                        <button className="ReloadPrompt-toast-button" onClick={() => updateServiceWorker(true)}>
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
