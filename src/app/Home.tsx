import clsx from 'clsx';
import { useState } from 'react';

import { Clip, Viewer } from '../components';
import {
  type CamClip,
  type CamFootage,
  type ClipType,
  genFootage,
  revokeFootage,
} from '../utils';

type Props = {
  items: CamClip[];
};

type FilterType = ClipType | 'all';
const filters: { label: string; value: FilterType }[] = [
  { label: '所有', value: 'all' },
  { label: '哨兵', value: 'sentry' },
  { label: '行车记录仪', value: 'saved' },
];

export function Home({ items }: Props) {
  const [filter, setFilter] = useState<FilterType>('all');
  const clips =
    filter === 'all' ? items : items.filter((i) => i.type === filter);

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
        <div className="sticky top-0 flex justify-center gap-1 bg-neutral-800 py-3">
          {filters.map((i) => (
            <button
              key={i.value}
              onClick={() => setFilter(i.value)}
              className={clsx(
                'cursor-pointer px-3 py-1 hover:bg-neutral-700',
                i.value === filter ? 'font-bold' : 'text-neutral-400',
              )}
            >
              {i.label}
            </button>
          ))}
        </div>
        {clips.map((item, i) => (
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
