'use client';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Welcome to MemFlow</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Application is loading...</h2>
          <p className="text-gray-600">Please wait while we load the application.</p>
        </div>
      </div>
    </div>
  );
}
