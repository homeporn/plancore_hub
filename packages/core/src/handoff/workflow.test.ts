import { describe, it, expect } from 'vitest';
import {
  applyHandoff,
  canHandoff,
  availableHandoffActions,
  HandoffError,
  type HandoffState,
} from './workflow.js';

const issued: HandoffState = { status: 'issued' };
const received: HandoffState = { status: 'received' };
const rejected: HandoffState = { status: 'rejected' };
const reworking: HandoffState = { status: 'reworking' };

describe('applyHandoff — plain route', () => {
  it('receiver receives an issued assignment', () => {
    expect(applyHandoff(issued, 'receive', 'receiver').status).toBe('received');
  });
  it('receiver accepts → accepted and unblocks development', () => {
    const t = applyHandoff(received, 'accept', 'receiver');
    expect(t.status).toBe('accepted');
    expect(t.unblocksDevelopment).toBe(true);
  });
});

describe('applyHandoff — rework route', () => {
  it('receiver rejects received → rejected', () => {
    expect(applyHandoff(received, 'reject', 'receiver').status).toBe('rejected');
  });
  it('sender reworks rejected → reworking', () => {
    expect(applyHandoff(rejected, 'rework', 'sender').status).toBe('reworking');
  });
  it('sender resubmits reworking → received', () => {
    expect(applyHandoff(reworking, 'resubmit', 'sender').status).toBe('received');
  });
  it('receiver can receive again after rework', () => {
    expect(applyHandoff(reworking, 'receive', 'receiver').status).toBe('received');
  });
});

describe('applyHandoff — guards', () => {
  it('sender cannot accept', () => {
    expect(() => applyHandoff(received, 'accept', 'sender')).toThrow(HandoffError);
  });
  it('receiver cannot rework', () => {
    expect(() => applyHandoff(rejected, 'rework', 'receiver')).toThrow(HandoffError);
  });
  it('cannot accept an issued assignment (wrong status)', () => {
    expect(() => applyHandoff(issued, 'accept', 'receiver')).toThrow(HandoffError);
  });
  it('only accept unblocks development', () => {
    expect(applyHandoff(received, 'reject', 'receiver').unblocksDevelopment).toBe(false);
  });
});

describe('canHandoff / availableHandoffActions', () => {
  it('canHandoff mirrors applyHandoff', () => {
    expect(canHandoff(received, 'accept', 'receiver')).toBe(true);
    expect(canHandoff(received, 'accept', 'sender')).toBe(false);
  });
  it('receiver on received sees accept + reject', () => {
    expect(availableHandoffActions(received, 'receiver').sort()).toEqual(['accept', 'reject']);
  });
  it('sender on rejected sees rework only', () => {
    expect(availableHandoffActions(rejected, 'sender')).toEqual(['rework']);
  });
  it('viewer never has actions', () => {
    expect(availableHandoffActions(received, 'viewer')).toEqual([]);
    expect(availableHandoffActions(issued, 'viewer')).toEqual([]);
  });
});
