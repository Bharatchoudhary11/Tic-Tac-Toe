import classNames from 'classnames';
import type { Mark } from '../types';

interface BoardProps {
  cells: (Mark | null)[];
  disabled: boolean;
  onMove: (index: number) => void;
}

export const Board = ({ cells, disabled, onMove }: BoardProps) => (
  <div className="board">
    {cells.map((value, idx) => (
      <button
        key={idx}
        className={classNames('cell', {
          'cell--x': value === 'X',
          'cell--o': value === 'O',
        })}
        type="button"
        disabled={disabled || Boolean(value)}
        onClick={() => onMove(idx)}
      >
        {value ?? ''}
      </button>
    ))}
  </div>
);
