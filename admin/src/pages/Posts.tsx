// src/pages/Posts.tsx
import React from 'react';

const Posts: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Posts</h1>
      <div className="bg-white p-4 rounded shadow">
        <p>List and moderate all user-submitted posts.</p>
        {/* You can add table/grid of posts fetched from Firestore here */}
      </div>
    </div>
  );
};

export default Posts;
