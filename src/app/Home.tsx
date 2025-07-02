import { useState } from 'react';

import { Clip, Viewer } from '../components';
import {
  type CamClip,
  type CamFootage,
  genFootage,
  revokeFootage,
} from '../utils';

type Props = {
  items: CamClip[];
};

export function Home({ items }: Props) {
  const [clip, setClip] = useState<CamClip>();
  const [footage, setFootage] = useState<CamFootage>();

  const loadClip = async (item: CamClip) => {
    if (item === clip) {
      return;
    }
    setClip(item);
    revokeFootage(footage);
    setFootage(undefined);
    const res = await genFootage(item.videos);
    console.log('genFootage', res);
    setFootage(res);
  };

  return (
    <div className="flex h-screen">
      <div className="max-w-80 shrink-0 overflow-y-scroll">
        {items.map((item, i) => (
          <Clip
            key={i}
            item={item}
            active={item.name === clip?.name}
            onClick={() => loadClip(item)}
          />
        ))}
      </div>

      {clip &&
        (footage ? (
          <Viewer key={clip.name} clip={clip} footage={footage} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-neutral-400">
            加载中
          </div>
        ))}
    </div>
  );
}
