import type { Story } from '@ladle/react';
import { MusicPlayer } from './MusicPlayer';

export const Player: Story = () => {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Music Player</h2>
      <p className="text-gray-600 mb-6">
        Switch themes using the sidebar dropdown to see different styles.
        Try the <strong>neobrutalism</strong> theme for a bold, high-contrast design!
      </p>

      <div className="max-w-sm">
        <MusicPlayer />
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-bold mb-2">Theme Features:</h3>
        <ul className="list-disc ml-6 space-y-1">
          <li><strong>Default:</strong> Dark retro player with green display</li>
          <li><strong>Modern:</strong> Sleek dark theme with emerald accents</li>
          <li><strong>Win95:</strong> Classic Windows 95 beveled style</li>
          <li><strong>Neobrutalism:</strong> Bold borders, high contrast, hard shadows</li>
        </ul>
      </div>
    </div>
  );
};

Player.storyName = 'Music Player';
