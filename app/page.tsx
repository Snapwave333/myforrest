import dynamic from 'next/dynamic';

// This is the key:
// We load the GameCanvas component dynamically and disable Server-Side Rendering (ssr)
const GameCanvas = dynamic(() => import('./components/GameCanvas'), {
  ssr: false,
  loading: () => <p>Loading game...</p>,
});

export default function Home() {
  return (
    <main className="main">
      <h1>Welcome to My Forrest</h1>
      <p>An endless world awaits...</p>

      {/* This will only render in the browser */}
      <GameCanvas />
    </main>
  );
}
