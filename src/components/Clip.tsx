import clsx from 'clsx';
import dayjs from 'dayjs';

import { type CamClip, parseTime } from '../utils';
import { ClipType } from './ClipType';
import { Thumb } from './Thumb';

type Props = {
  item: CamClip;
  active?: boolean;
  onClick?: () => void;
};

export function Clip({ item, active, onClick }: Props) {
  const timeStr = parseTime(item.name);
  const datetime = dayjs(timeStr).format('YYYY年MM月DD日 HH:mm');

  return (
    <div
      className={clsx(
        'flex cursor-pointer items-center gap-4 p-4',
        active ? 'bg-neutral-700' : 'hover:bg-neutral-700',
      )}
      onClick={onClick}
    >
      <Thumb file={item.thumb} />
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <ClipType clip={item} />
          <div className="text-neutral-400">
            {[item.event?.city, item.event?.street].filter(Boolean).join(' ')}
          </div>
        </div>
        <div>{datetime}</div>
      </div>
    </div>
  );
}
