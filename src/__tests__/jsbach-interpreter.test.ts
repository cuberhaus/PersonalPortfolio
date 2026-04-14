import { describe, it, expect } from 'vitest';
import { interpret, SAMPLE_PROGRAMS } from '../lib/jsbach/interpreter';

describe('JSBach interpreter — basics', () => {
  it('requires a Main procedure', () => {
    const result = interpret(`Foo |:
  <!> "hi"
:|`);
    expect(result.error).toMatch(/Main/i);
  });

  it('empty Main produces no output or notes', () => {
    const result = interpret(`Main |:
:|`);
    expect(result.error).toBeUndefined();
    expect(result.output).toEqual([]);
    expect(result.notes).toEqual([]);
  });
});

describe('JSBach interpreter — write (<!>)', () => {
  it('prints a string', () => {
    const result = interpret(`Main |:
  <!> "hello"
:|`);
    expect(result.output).toEqual(['hello']);
  });

  it('prints a number', () => {
    const result = interpret(`Main |:
  x <- 42
  <!> x
:|`);
    expect(result.output).toEqual(['42']);
  });

  it('prints multiple values', () => {
    const result = interpret(`Main |:
  <!> "a"
  <!> "b"
:|`);
    expect(result.output).toEqual(['a', 'b']);
  });
});

describe('JSBach interpreter — arithmetic', () => {
  it('addition', () => {
    const r = interpret(`Main |:
  <!> 3 + 4
:|`);
    expect(r.output).toEqual(['7']);
  });

  it('multiplication', () => {
    const r = interpret(`Main |:
  <!> 6 * 7
:|`);
    expect(r.output).toEqual(['42']);
  });

  it('integer division', () => {
    const r = interpret(`Main |:
  <!> 7 / 2
:|`);
    expect(r.output).toEqual(['3']);
  });

  it('modulo', () => {
    const r = interpret(`Main |:
  <!> 10 % 3
:|`);
    expect(r.output).toEqual(['1']);
  });

  it('division by zero returns 0', () => {
    const r = interpret(`Main |:
  <!> 5 / 0
:|`);
    expect(r.output).toEqual(['0']);
  });
});

describe('JSBach interpreter — control flow', () => {
  it('if-true branch executes', () => {
    const r = interpret(`Main |:
  if 1 > 0 |:
    <!> "yes"
  :|
:|`);
    expect(r.output).toEqual(['yes']);
  });

  it('if-false with else branch', () => {
    const r = interpret(`Main |:
  if 0 > 1 |:
    <!> "yes"
  :| else |:
    <!> "no"
  :|
:|`);
    expect(r.output).toEqual(['no']);
  });

  it('while loop counts', () => {
    const r = interpret(`Main |:
  i <- 0
  while i < 5 |:
    i <- i + 1
  :|
  <!> i
:|`);
    expect(r.output).toEqual(['5']);
  });

  it('infinite loop is caught', () => {
    const r = interpret(`Main |:
  while 1 > 0 |:
    x <- 1
  :|
:|`);
    expect(r.error).toMatch(/loop|limit/i);
  });
});

describe('JSBach interpreter — procedures', () => {
  it('calls a user-defined procedure', () => {
    const r = interpret(`Double x |:
  <!> x * 2
:|

Main |:
  Double 21
:|`);
    expect(r.output).toEqual(['42']);
  });

  it('calling undefined procedure is an error', () => {
    const r = interpret(`Main |:
  Unknown 5
:|`);
    expect(r.error).toMatch(/Undefined procedure/i);
  });
});

describe('JSBach interpreter — play (<:>)', () => {
  it('plays a note by name', () => {
    const r = interpret(`Main |:
  <:> C
:|`);
    expect(r.notes).toHaveLength(1);
    expect(typeof r.notes[0]).toBe('number');
  });

  it('plays a note by integer', () => {
    const r = interpret(`Main |:
  <:> 30
:|`);
    expect(r.notes).toEqual([30]);
  });

  it('plays a list of notes', () => {
    const r = interpret(`Main |:
  notes <- {C D E}
  <:> notes
:|`);
    expect(r.notes).toHaveLength(3);
  });
});

describe('JSBach interpreter — lists', () => {
  it('list creation and access', () => {
    const r = interpret(`Main |:
  xs <- {10 20 30}
  <!> xs[2]
:|`);
    expect(r.output).toEqual(['20']);
  });

  it('list size (#)', () => {
    const r = interpret(`Main |:
  xs <- {1 2 3 4}
  <!> #xs
:|`);
    expect(r.output).toEqual(['4']);
  });
});

describe('JSBach interpreter — read (<?>) with inputs', () => {
  it('reads from provided input values', () => {
    const r = interpret(`Main |:
  <?> x
  <!> x
:|`, [99]);
    expect(r.output).toEqual(['99']);
  });

  it('defaults to 0 when inputs exhausted', () => {
    const r = interpret(`Main |:
  <?> x
  <?> y
  <!> y
:|`, [5]);
    expect(r.output).toEqual(['0']);
  });
});

describe('JSBach interpreter — sample programs', () => {
  for (const sample of SAMPLE_PROGRAMS) {
    it(`"${sample.name}" runs without error`, () => {
      const result = interpret(sample.code);
      expect(result.error).toBeUndefined();
    });
  }

  it('"Happy Birthday" produces 19 notes', () => {
    const r = interpret(SAMPLE_PROGRAMS[0].code);
    expect(r.notes).toHaveLength(19);
  });

  it('"Scale" produces 8 notes', () => {
    const r = interpret(SAMPLE_PROGRAMS[1].code);
    expect(r.notes).toHaveLength(8);
  });

  it('"Fibonacci Notes" produces 16 notes', () => {
    const r = interpret(SAMPLE_PROGRAMS[2].code);
    expect(r.notes).toHaveLength(16);
  });

  it('"Simple Song" outputs a message and produces 13 notes', () => {
    const r = interpret(SAMPLE_PROGRAMS[3].code);
    expect(r.output).toHaveLength(1);
    expect(r.output[0]).toMatch(/melody/i);
    expect(r.notes).toHaveLength(13);
  });
});
