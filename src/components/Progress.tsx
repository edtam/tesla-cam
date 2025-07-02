import { correctNum } from '../utils';

type Props = {
  value?: number;
  max?: number;
  mark?: number;
  onChange?: (val: number) => void;
};

export function Progress({ value = 1, max = 1, mark, onChange }: Props) {
  const percent = (value / max) * 100;
  const markPercent = mark && (mark / max) * 100;

  const handleClick = (width: number, offset: number) => {
    const value = (offset / width) * max;
    const limitVal = correctNum(value, 0, max);
    onChange?.(limitVal);
  };

  return (
    <div
      className="group -my-2 cursor-pointer py-2"
      onClick={(e) => {
        handleClick(e.currentTarget.clientWidth, e.nativeEvent.offsetX);
      }}
    >
      <div className="relative h-1 overflow-hidden rounded-full bg-neutral-400/60 group-hover:bg-neutral-400/80">
        <div
          className="h-full bg-neutral-200 group-hover:bg-white"
          style={{ width: `${percent}%` }}
        ></div>
        {markPercent && (
          <div
            className="absolute top-0 bottom-0 w-2 bg-red-700"
            style={{ left: `${markPercent}%` }}
          ></div>
        )}
      </div>
    </div>
  );
}
