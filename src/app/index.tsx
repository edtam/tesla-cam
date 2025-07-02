import { useState } from 'react';

import type { CamClip } from '../utils';
import { Home } from './Home';
import { Start } from './Start';

export function App() {
  const [clips, setClips] = useState<CamClip[]>();

  if (!clips?.length) {
    return <Start onChange={setClips} />;
  }

  return <Home items={clips} />;
}
