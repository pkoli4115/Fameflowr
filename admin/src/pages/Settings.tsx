import React from 'react';

const Settings: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Settings</h1>
      <div className="bg-white p-4 rounded shadow">
        <p>Configure Fameflowr admin panel settings here.</p>
        {/* Add theme, notification, privacy settings etc. */}
      </div>
    </div>
  );
};

export default Settings;
