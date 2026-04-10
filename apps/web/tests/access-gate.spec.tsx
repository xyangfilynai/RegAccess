import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AccessGate } from '../src/access/AccessGate';
import type { VerifyAccessPassResult } from '../src/access/pass-types';
import { assessmentStore } from '../src/lib/assessment-store';
import { PERSISTENCE_KEYS } from '../src/lib/persistence-keys';
import { createSignedAccessPass } from './access-test-helpers';

describe('AccessGate', () => {
  it('unlocks the app after a valid permanent pass is pasted', async () => {
    const fixture = await createSignedAccessPass({
      payload: {
        kind: 'permanent',
        expiresAt: null,
      },
    });

    render(
      <AccessGate publicKeyPem={fixture.publicKeyPem}>
        <div>Protected app</div>
      </AccessGate>,
    );

    fireEvent.change(screen.getByTestId('access-pass-input'), {
      target: { value: fixture.rawPass },
    });
    fireEvent.click(screen.getByTestId('unlock-pass-btn'));

    await screen.findByText('Protected app');
    expect(localStorage.getItem(PERSISTENCE_KEYS.accessPass)).toBe(fixture.rawPass);
  });

  it('unlocks the app after a valid temporary pass is pasted', async () => {
    const fixture = await createSignedAccessPass({
      payload: {
        kind: 'temporary',
        issuedAt: '2026-03-01T00:00:00.000Z',
      },
    });

    render(
      <AccessGate publicKeyPem={fixture.publicKeyPem} now={new Date('2026-03-10T00:00:00.000Z')}>
        <div>Protected app</div>
      </AccessGate>,
    );

    fireEvent.change(screen.getByTestId('access-pass-input'), {
      target: { value: fixture.rawPass },
    });
    fireEvent.click(screen.getByTestId('unlock-pass-btn'));

    await screen.findByText('Protected app');
    expect(localStorage.getItem(PERSISTENCE_KEYS.accessPass)).toBe(fixture.rawPass);
  });

  it('re-locks on startup when the stored temporary pass has expired', async () => {
    const fixture = await createSignedAccessPass({
      payload: {
        kind: 'temporary',
        issuedAt: '2026-03-01T00:00:00.000Z',
      },
    });

    localStorage.setItem(PERSISTENCE_KEYS.accessPass, fixture.rawPass);

    render(
      <AccessGate publicKeyPem={fixture.publicKeyPem} now={new Date('2026-03-20T00:00:00.000Z')}>
        <div>Protected app</div>
      </AccessGate>,
    );

    expect(await screen.findByText(/temporary access pass expired/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected app')).not.toBeInTheDocument();
  });

  it('clears protected persistence when an expired stored pass is found on startup', async () => {
    const fixture = await createSignedAccessPass({
      payload: {
        kind: 'temporary',
        issuedAt: '2026-03-01T00:00:00.000Z',
      },
    });

    localStorage.setItem(PERSISTENCE_KEYS.accessPass, fixture.rawPass);
    localStorage.setItem(PERSISTENCE_KEYS.draftAnswers, JSON.stringify({ A1: '510(k)' }));
    localStorage.setItem(PERSISTENCE_KEYS.draftBlockIndex, '3');
    assessmentStore.save({
      name: 'Protected record',
      answers: { A1: '510(k)' },
      blockIndex: 2,
      lastPathway: 'Letter to File',
    });

    render(
      <AccessGate publicKeyPem={fixture.publicKeyPem} now={new Date('2026-03-20T00:00:00.000Z')}>
        <div>Protected app</div>
      </AccessGate>,
    );

    await screen.findByText(/temporary access pass expired/i);

    expect(localStorage.getItem(PERSISTENCE_KEYS.accessPass)).toBeNull();
    expect(localStorage.getItem(PERSISTENCE_KEYS.draftAnswers)).toBeNull();
    expect(localStorage.getItem(PERSISTENCE_KEYS.draftBlockIndex)).toBeNull();
    expect(localStorage.getItem(PERSISTENCE_KEYS.savedAssessments)).toBeNull();
    expect(localStorage.getItem(PERSISTENCE_KEYS.savedAssessmentIndex)).toBeNull();
    expect(assessmentStore.list()).toEqual([]);
  });

  it('removes the stored pass and re-locks the app when the user removes access', async () => {
    const fixture = await createSignedAccessPass({
      payload: {
        kind: 'permanent',
        expiresAt: null,
      },
    });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    localStorage.setItem(PERSISTENCE_KEYS.draftAnswers, JSON.stringify({ A1: '510(k)' }));

    render(
      <AccessGate publicKeyPem={fixture.publicKeyPem}>
        <div>Protected app</div>
      </AccessGate>,
    );

    fireEvent.change(screen.getByTestId('access-pass-input'), {
      target: { value: fixture.rawPass },
    });
    fireEvent.click(screen.getByTestId('unlock-pass-btn'));
    await screen.findByText('Protected app');

    fireEvent.click(screen.getByRole('button', { name: 'Remove access pass' }));

    await screen.findByText(/access pass removed from this device/i);
    expect(localStorage.getItem(PERSISTENCE_KEYS.accessPass)).toBeNull();
    expect(localStorage.getItem(PERSISTENCE_KEYS.draftAnswers)).toBeNull();
    expect(screen.queryByText('Protected app')).not.toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it('re-locks when a stored permanent pass was signed with a different key (key rotation)', async () => {
    const originalKey = await createSignedAccessPass({
      payload: {
        kind: 'permanent',
        expiresAt: null,
      },
    });

    const newKey = await createSignedAccessPass({
      payload: {
        kind: 'permanent',
        expiresAt: null,
      },
    });

    // Store a pass signed with the original key
    localStorage.setItem(PERSISTENCE_KEYS.accessPass, originalKey.rawPass);

    // Boot the app with the NEW public key (simulates key rotation)
    render(
      <AccessGate publicKeyPem={newKey.publicKeyPem}>
        <div>Protected app</div>
      </AccessGate>,
    );

    // The stored pass should fail signature verification and the gate should lock
    await screen.findByTestId('access-pass-input');
    expect(screen.queryByText('Protected app')).not.toBeInTheDocument();
    expect(localStorage.getItem(PERSISTENCE_KEYS.accessPass)).toBeNull();
  });

  it('keeps the main app hidden until startup access validation succeeds', async () => {
    const storedPass = 'stored-pass-token';
    const payload = {
      version: 1,
      passId: 'pass-001',
      label: 'QA tester',
      kind: 'permanent' as const,
      issuedAt: '2026-03-01T00:00:00.000Z',
      expiresAt: null,
    };

    localStorage.setItem(PERSISTENCE_KEYS.accessPass, storedPass);

    let resolveVerification: ((value: VerifyAccessPassResult) => void) | null = null;
    const verifyPassFn = vi.fn(
      (): Promise<VerifyAccessPassResult> =>
        new Promise((resolve) => {
          resolveVerification = resolve;
        }),
    );

    render(
      <AccessGate
        publicKeyPem={'-----BEGIN PUBLIC KEY-----\nTEST\n-----END PUBLIC KEY-----'}
        verifyPassFn={verifyPassFn}
      >
        <div>Protected app</div>
      </AccessGate>,
    );

    expect(screen.getByText(/checking local access pass/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected app')).not.toBeInTheDocument();

    await act(async () => {
      resolveVerification?.({
        ok: true,
        payload,
        rawPass: storedPass,
      });
    });

    await waitFor(() => expect(screen.getByText('Protected app')).toBeInTheDocument());
  });
});
