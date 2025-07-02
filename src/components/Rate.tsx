type Props = {
  value: number;
  onChange: (val: number) => void;
};

export function Rate({ value, onChange }: Props) {
  const rates = [0.5, 1, 2, 3];

  const changeRate = () => {
    const index = rates.indexOf(value);
    const rate = rates.at(index + 1);
    onChange(rate || rates[0]);
  };

  return (
    <button
      className="cursor-pointer rounded-lg bg-neutral-800 px-4 py-2 hover:bg-neutral-700"
      onClick={changeRate}
    >
      {value}x
    </button>
  );
}
