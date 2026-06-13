'use client';
import { useState } from 'react';

export default function AdminWhatsapp() {
  const [phone, setPhone] = useState('923244643714');
  const [pairingCode, setPairingCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handlePairing = async () => {
    setLoading(true);
    setError('');
    setPairingCode('');
    setSuccess(false);
    setStatusMessage('Connecting to backend...');

    try {
      const backendUrl = process.env.NEXT_PUBLIC_WHATSAPP_BACKEND_URL;
      
      if (!backendUrl) {
        throw new Error('Backend URL not configured. Add NEXT_PUBLIC_WHATSAPP_BACKEND_URL to .env.local');
      }

      setStatusMessage('Requesting pairing code (may take 30s if backend is sleeping)...');
      
      const res = await fetch(`${backendUrl}/api/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to pair');

      setPairingCode(data.code);
      setSuccess(true);
      setStatusMessage('');
    } catch (err: any) {
      setError(err.message);
      setStatusMessage('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">🔗 WhatsApp Linking</h2>
      <p className="text-sm text-gray-600">
        Enter the number you want to link as the sender. A pairing code will be generated.
        Open WhatsApp → Settings → Linked Devices → Link a Device → <strong>Link with Phone Number</strong>.
      </p>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">WhatsApp Number</label>
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g., 923244643714"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      <button
        onClick={handlePairing}
        disabled={loading}
        className={`w-full py-3 px-4 rounded-lg text-white font-semibold transition-colors ${
          loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        {loading ? '⏳ Generating Code...' : '📲 Get Pairing Code'}
      </button>

      {statusMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
          {statusMessage}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          ❌ {error}
        </div>
      )}

      {success && pairingCode && (
        <div className="mt-4 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">Your Pairing Code:</p>
          <p className="font-mono text-3xl font-bold text-green-700 tracking-wider text-center py-2 bg-white rounded border border-green-200">
            {pairingCode}
          </p>
          <div className="mt-3 text-xs text-gray-500 space-y-1">
            <p>📱 Steps to link:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Open WhatsApp on your phone</li>
              <li>Go to Settings → Linked Devices</li>
              <li>Tap "Link a Device"</li>
              <li>Choose "Link with Phone Number"</li>
              <li>Enter the code above</li>
            </ol>
          </div>
          <div className="mt-3 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
            💡 After successful linking, check Render logs for Session ID: <code className="font-mono">zaidashiq_...</code>
          </div>
        </div>
      )}
      
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="font-semibold text-gray-700 mb-2">ℹ️ Important Notes</h3>
        <ul className="text-sm text-gray-600 space-y-2">
          <li>• Backend runs on Render.com (free tier)</li>
          <li>• First request may take 30-40 seconds (backend waking up)</li>
          <li>• If you get "Connection Failure", wait 30s and try again</li>
          <li>• Target numbers (+92 324 4643714, +92 371 1286436) will receive notifications</li>
          <li>• Commands: itemsms, itemspic, clippingms, clippingpic</li>
        </ul>
      </div>
    </div>
  );
}
