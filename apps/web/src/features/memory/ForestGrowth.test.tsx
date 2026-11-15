import { describe, expect, it } from 'vitest';
import type { ForestThreshold } from '@pyneath/contracts';
import { ForestGrowth } from './ForestGrowth';

describe('shared growth placement preserves the personal scene', () => {
  it('keeps the original personal origin and namespace when no Camp options are supplied', () => {
    const earned: ForestThreshold[] = [1, 3, 7];
    const personal = ForestGrowth({ earned })!;
    const camp = ForestGrowth({ earned, namespace: 'camp', origin: [3.4, .12, 1.5] })!;
    expect(personal.props.position).toEqual([1.2, .12, -1.7]);
    expect(personal.props.name).toBe('personal-forest-growth');
    expect(camp.props.name).toBe('camp-forest-growth');
    expect(camp.props.children.map((item: { props: { position: number[] } }) => item.props.position)).toEqual(personal.props.children.map((item: { props: { position: number[] } }) => item.props.position));
    expect(ForestGrowth({ earned: [] })).toBeNull();
  });
});
