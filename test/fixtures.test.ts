import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EventStore } from '../src/store';

describe('Validation Fixtures', () => {
  const loadFixture = (filename: string) => {
    const path = join(__dirname, '../fixtures/validation', filename);
    return readFileSync(path, 'utf-8');
  };

  it('rejects events_before_open fixture', () => {
    const data = loadFixture('events_before_open.json');
    expect(() => EventStore.deserialize(data)).toThrow('EVENT_BEFORE_SESSION_OPENED');
  });

  it('rejects events_after_close fixture', () => {
    const data = loadFixture('events_after_close.json');
    expect(() => EventStore.deserialize(data)).toThrow('EVENT_AFTER_SESSION_CLOSED');
  });

  it('rejects invalid_reference fixture', () => {
    const data = loadFixture('invalid_reference.json');
    expect(() => EventStore.deserialize(data)).toThrow('INVALID_REFERENCE');
  });
});
