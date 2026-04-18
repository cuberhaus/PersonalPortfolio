import { describe, it, expect } from 'vitest';
import { validateEmail } from '../lib/email-validator';

describe('validateEmail — structural checks', () => {
  it('rejects empty / whitespace-only input', () => {
    expect(validateEmail('')).toEqual({ valid: false, reason: 'empty' });
    expect(validateEmail('   ')).toEqual({ valid: false, reason: 'empty' });
  });

  it('rejects addresses without @', () => {
    expect(validateEmail('not-an-email')).toEqual({ valid: false, reason: 'format' });
  });

  it('rejects multiple @', () => {
    expect(validateEmail('a@b@c.com')).toEqual({ valid: false, reason: 'format' });
  });

  it('rejects addresses starting or ending with @', () => {
    expect(validateEmail('@foo.com')).toEqual({ valid: false, reason: 'format' });
    expect(validateEmail('foo@')).toEqual({ valid: false, reason: 'format' });
  });

  it('rejects missing / too-short TLDs', () => {
    expect(validateEmail('foo@bar')).toEqual({ valid: false, reason: 'format' });
    expect(validateEmail('foo@bar.c')).toEqual({ valid: false, reason: 'format' });
  });

  it('rejects consecutive / leading / trailing dots in local part', () => {
    expect(validateEmail('foo..bar@example.org')).toEqual({ valid: false, reason: 'format' });
    expect(validateEmail('.foo@example.org')).toEqual({ valid: false, reason: 'format' });
    expect(validateEmail('foo.@example.org')).toEqual({ valid: false, reason: 'format' });
  });

  it('rejects domains with consecutive dots or leading/trailing hyphens', () => {
    expect(validateEmail('foo@example..org')).toEqual({ valid: false, reason: 'format' });
    expect(validateEmail('foo@-example.org')).toEqual({ valid: false, reason: 'format' });
    expect(validateEmail('foo@example-.org')).toEqual({ valid: false, reason: 'format' });
  });

  it('accepts well-formed addresses', () => {
    expect(validateEmail('polcg10@proton.me')).toEqual({
      valid: true,
      normalized: 'polcg10@proton.me',
    });
    expect(validateEmail('first.last+tag@company.co.uk')).toEqual({
      valid: true,
      normalized: 'first.last+tag@company.co.uk',
    });
  });

  it('trims and lowercases', () => {
    expect(validateEmail('  Foo.Bar@Example.ORG  ')).toEqual({
      valid: true,
      normalized: 'foo.bar@example.org',
    });
  });
});

describe('validateEmail — typo detection', () => {
  it('catches domain typos (ail.com → gmail.com)', () => {
    expect(validateEmail('polcg10@ail.com')).toEqual({
      valid: false,
      reason: 'typo',
      suggestion: 'polcg10@gmail.com',
    });
  });

  it('catches domain typos (gmial.com → gmail.com)', () => {
    expect(validateEmail('me@gmial.com')).toEqual({
      valid: false,
      reason: 'typo',
      suggestion: 'me@gmail.com',
    });
  });

  it('catches TLD typos (gmail.con → gmail.com)', () => {
    expect(validateEmail('me@gmail.con')).toEqual({
      valid: false,
      reason: 'typo',
      suggestion: 'me@gmail.com',
    });
  });

  it('catches second-level-domain typos (hotnail → hotmail)', () => {
    expect(validateEmail('me@hotnail.com')).toEqual({
      valid: false,
      reason: 'typo',
      suggestion: 'me@hotmail.com',
    });
  });

  it('catches fuzzy typos (gmailx.com → gmail.com)', () => {
    expect(validateEmail('user@gmailx.com')).toEqual({
      valid: false,
      reason: 'typo',
      suggestion: 'user@gmail.com',
    });
  });

  it('does not flag unknown but valid-looking corporate domains', () => {
    expect(validateEmail('person@some-company.io')).toEqual({
      valid: true,
      normalized: 'person@some-company.io',
    });
  });

  it('does not flag popular domains typed correctly', () => {
    expect(validateEmail('me@gmail.com')).toEqual({
      valid: true,
      normalized: 'me@gmail.com',
    });
    expect(validateEmail('me@outlook.com')).toEqual({
      valid: true,
      normalized: 'me@outlook.com',
    });
    expect(validateEmail('me@hotmail.com')).toEqual({
      valid: true,
      normalized: 'me@hotmail.com',
    });
    expect(validateEmail('me@yahoo.com')).toEqual({
      valid: true,
      normalized: 'me@yahoo.com',
    });
    expect(validateEmail('me@proton.me')).toEqual({
      valid: true,
      normalized: 'me@proton.me',
    });
  });

  it("preserves the user's local part in the suggestion", () => {
    expect(validateEmail('My.Name+filter@gmai.com')).toEqual({
      valid: false,
      reason: 'typo',
      suggestion: 'my.name+filter@gmail.com',
    });
  });
});
