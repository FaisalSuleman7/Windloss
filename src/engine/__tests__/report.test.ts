import { describe, it, expect } from 'vitest';
import { RHO_STD, R_DRY } from '../report';

describe('report constants', () => {
  it('defines physical air constants accurately', () => {
    expect(R_DRY).toBe(287.05);
    expect(RHO_STD).toBe(1.225);
  });
});
