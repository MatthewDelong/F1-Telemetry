import React, { useState, useEffect } from 'react';
import axios from 'axios';

export const AdminPage = () => {
  const [status, setStatus] = useState({});
  const [f2Url, setF2Url] = useState('');
  const [f1aUrl, setF1aUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  if (!import.meta.env.DEV) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)] text-white text-2xl">
        Access Denied: This page is only available in development mode.
      </div>
    );
  }

  const fetchStatus = async () => {
    try {
      const res = await axios.get('/api/admin/update/status');
      setStatus(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleUpdate = async (type, url = '') => {
    setLoading(true);
    addLog(`Starting update for ${type}...`);
    try {
      const res = await axios.post(`/api/admin/update/${type}`, { url });
      addLog(`Success (${type}):\n${res.data.output}`);
      fetchStatus();
    } catch (e) {
      addLog(`Error (${type}):\n${e.response?.data?.error || e.message}`);
    }
    setLoading(false);
  };

  const clearCache = async () => {
    if (!window.confirm('Are you sure you want to clear all backend and browser caches?')) return;
    setLoading(true);
    addLog('Clearing backend caches...');
    try {
      const res = await axios.get('/api/admin/clear-cache');
      addLog(`Backend Success:\n${res.data.message}`);
    } catch (e) {
      addLog(`Error clearing backend cache:\n${e.response?.data?.error || e.message}`);
    }
    
    addLog('Clearing browser localStorage caches...');
    try {
      let clearedCount = 0;
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('f1_cache_')) {
          localStorage.removeItem(key);
          clearedCount++;
        }
      });
      addLog(`Browser Cache Success: Cleared ${clearedCount} items from localStorage.`);
    } catch (e) {
      addLog(`Error clearing browser cache:\n${e.message}`);
    }
    
    setLoading(false);
  };

  const clearLiveCache = async () => {
    if (!window.confirm('Are you sure you want to clear the LIVE server cache? This forces the live site to fetch the latest GitHub data.')) return;
    setLoading(true);
    addLog('Clearing live cache on f1-telemetry.co.uk...');
    try {
      const endpoints = [
        'https://f1-telemetry.co.uk/api.php?source=f1&path=races/2026/driverStandings.json&flush=1',
        'https://f1-telemetry.co.uk/api.php?source=f1&path=races/2026/constructorStandings.json&flush=1',
        'https://f1-telemetry.co.uk/api.php?source=f1&path=results.json&flush=1',
        'https://f1-telemetry.co.uk/api.php?source=f1&path=sprint.json&flush=1',
        'https://f1-telemetry.co.uk/api.php?source=f1&path=qualifying.json&flush=1',
        'https://f1-telemetry.co.uk/api.php?source=f1&path=races/races.json&flush=1',
        'https://f1-telemetry.co.uk/api.php?source=f2&path=results.json&flush=1',
        'https://f1-telemetry.co.uk/api.php?source=f1a&path=results.json&flush=1'
      ];
      
      for (const url of endpoints) {
        try {
          await fetch(url, { mode: 'no-cors' });
          const path = url.split('path=')[1].split('&')[0];
          addLog(`Flushed live cache for: ${path}`);
        } catch(e) {
          addLog(`Error flushing ${url}: ${e.message}`);
        }
      }
      addLog('Live cache cleared successfully!');
    } catch (e) {
      addLog(`Error clearing live cache:\n${e.message}`);
    }
    setLoading(false);
  };

  const addLog = (msg) => {
    setLogs(prev => [msg, ...prev]);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never updated or file missing';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="container mx-auto p-8 text-white mt-12 mb-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-4">
          <button 
            onClick={clearCache}
            disabled={loading}
            className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white font-bold py-2 px-6 rounded shadow-lg transition-colors"
          >
            Clear Local Cache
          </button>
          <button 
            onClick={clearLiveCache}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-2 px-6 rounded shadow-lg transition-colors"
          >
            Clear LIVE Cache
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        {/* F1 Section */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
          <h2 className="text-2xl font-bold mb-4 text-red-500">F1 Data</h2>
          <p className="text-gray-400 mb-4">
            Last Updated: <span className="text-white">{formatDate(status?.f1?.lastUpdated)}</span>
          </p>
          <button 
            onClick={() => handleUpdate('f1')}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded transition-colors"
          >
            Run api_update.py
          </button>
        </div>

        {/* F2 Section */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
          <h2 className="text-2xl font-bold mb-4 text-blue-500">F2 Data</h2>
          <p className="text-gray-400 mb-4">
            Last Updated: <span className="text-white">{formatDate(status?.f2?.lastUpdated)}</span>
          </p>
          <input 
            type="text" 
            placeholder="Race Results URL" 
            className="w-full p-2 mb-4 bg-gray-700 text-white border border-gray-600 rounded focus:border-blue-500 focus:outline-none"
            value={f2Url}
            onChange={(e) => setF2Url(e.target.value)}
          />
          <button 
            onClick={() => handleUpdate('f2', f2Url)}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded transition-colors"
          >
            Run api_update.py
          </button>
        </div>

        {/* F1A Section */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
          <h2 className="text-2xl font-bold mb-4 text-pink-500">F1 Academy Data</h2>
          <p className="text-gray-400 mb-4">
            Last Updated: <span className="text-white">{formatDate(status?.f1a?.lastUpdated)}</span>
          </p>
          <input 
            type="text" 
            placeholder="Race Results URL" 
            className="w-full p-2 mb-4 bg-gray-700 text-white border border-gray-600 rounded focus:border-pink-500 focus:outline-none"
            value={f1aUrl}
            onChange={(e) => setF1aUrl(e.target.value)}
          />
          <button 
            onClick={() => handleUpdate('f1a', f1aUrl)}
            disabled={loading}
            className="w-full bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded transition-colors"
          >
            Run api_update.py
          </button>
        </div>
      </div>

      <div className="bg-gray-900 p-6 rounded-lg shadow-lg border border-gray-800 h-96 flex flex-col">
        <h3 className="text-xl font-bold mb-4 text-gray-300">Execution Logs</h3>
        <div className="font-mono text-sm overflow-y-auto flex-grow bg-black p-4 rounded border border-gray-800">
          {logs.map((log, i) => (
            <div key={i} className="mb-3 border-b border-gray-800 pb-3 last:border-b-0 last:pb-0">
              <pre className="whitespace-pre-wrap text-green-400 break-words">{log}</pre>
            </div>
          ))}
          {logs.length === 0 && <p className="text-gray-600 italic">No logs yet. Run an update to see output.</p>}
        </div>
      </div>
    </div>
  );
};
