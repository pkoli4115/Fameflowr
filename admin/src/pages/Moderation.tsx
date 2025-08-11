import React from 'react';

const Moderation: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Moderation</h1>
      <div className="bg-white p-4 rounded shadow">
        <p>Review reported posts, content flags, and violations.</p>
        {/* Add flagged content moderation tools here */}
      </div>
    </div>
  );
};

export default Moderation;
