import { describe, it, expect } from 'vitest';
import { getParkCombinations } from '../backtest';

describe('backtest combination generator', () => {
  it('generates all non-empty combinations of reference parks', () => {
    const combs = getParkCombinations(['H', 'O']);
    const keys = combs.map((c) => c.join('+'));
    expect(keys).toContain('H');
    expect(keys).toContain('O');
    expect(keys).toContain('H+O');
    expect(keys.length).toBe(3);
  });
});
