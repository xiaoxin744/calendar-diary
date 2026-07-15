import { describe, expect, it } from 'vitest';
import { escapeRegExp } from './textUtils';

describe('escapeRegExp', () => {
  it('turns user search text into a literal regular expression', () => {
    const query = '[计划] (A+B)?';
    const expression = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    expect('今天完成 [计划] (A+B)?。'.split(expression)).toContain(query);
  });
});
