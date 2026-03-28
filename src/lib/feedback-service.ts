import type { FeedbackFormData } from './feedback-types';

/** Submission payload — matches form data plus metadata. */
interface FeedbackPayload {
  submittedAt: string;
  formData: FeedbackFormData;
}

/** Abstract submission interface — swap the implementation when a real backend exists. */
interface FeedbackSubmitter {
  submit(payload: FeedbackPayload): Promise<{ ok: boolean }>;
}

/**
 * Placeholder submitter that persists to localStorage.
 * Replace with an API-backed implementation when ready.
 */
const localStorageSubmitter: FeedbackSubmitter = {
  async submit(payload) {
    try {
      const key = 'regassess-feedback';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(payload);
      localStorage.setItem(key, JSON.stringify(existing));
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },
};

/** Default submitter used by the app. */
export const feedbackService: FeedbackSubmitter = localStorageSubmitter;
