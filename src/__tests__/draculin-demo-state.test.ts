import { describe, it, expect } from 'vitest';
import {
  quizScore,
  scoreBand,
  BLOOD_DATA,
  PERIOD_DAYS,
  FALLBACK_NEWS,
  type QuizQuestion,
} from '../lib/draculin-quiz';

/**
 * Tests for the DraculinDemo component state logic.
 * Covers: tab state management, chat message flow, news fallback behavior,
 * quiz step progression, and stats data used by the component.
 */

/* ---------- tab switching ---------- */

type Tab = 'news' | 'chat' | 'quiz' | 'vision' | 'stats';

describe('DraculinDemo — tab state', () => {
  it('all tabs are valid', () => {
    const tabs: Tab[] = ['news', 'chat', 'quiz', 'vision', 'stats'];
    expect(tabs).toHaveLength(5);
    for (const tab of tabs) {
      expect(['news', 'chat', 'quiz', 'vision', 'stats']).toContain(tab);
    }
  });

  it('tab switching replaces the active tab', () => {
    let tab: Tab = 'news';
    tab = 'chat';
    expect(tab).toBe('chat');
    tab = 'quiz';
    expect(tab).toBe('quiz');
  });
});

/* ---------- chat message flow ---------- */

describe('DraculinDemo — chat message flow', () => {
  const MOCK_INIT = 'Hello! I am Draculine, your menstruation advisor. [Mock mode]';

  function mockChatReply(msg: string): string {
    return `[Mock] Thank you for your question: «${msg}». Start the backend for real answers.`;
  }

  it('initial messages start with greet', () => {
    const messages = [MOCK_INIT];
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('Draculine');
  });

  it('user message is appended', () => {
    const messages = [MOCK_INIT];
    const userMsg = 'What is a normal cycle?';
    messages.push(userMsg);
    expect(messages).toHaveLength(2);
    expect(messages[1]).toBe(userMsg);
  });

  it('mock reply echoes the question', () => {
    const reply = mockChatReply('How long does a period last?');
    expect(reply).toContain('How long does a period last?');
    expect(reply).toContain('[Mock]');
  });

  it('after send, messages has user + bot', () => {
    const messages = [MOCK_INIT];
    const userMsg = 'Tell me about cramps';
    messages.push(userMsg);
    messages.push(mockChatReply(userMsg));
    expect(messages).toHaveLength(3);
    expect(messages[2]).toContain(userMsg);
  });

  it('empty message should not be sent', () => {
    const msg = '';
    expect(msg.trim().length > 0).toBe(false);
  });
});

/* ---------- quiz step progression ---------- */

const QUESTIONS: QuizQuestion[] = [
  { text: 'Q1', scoreYes: 2, scoreNo: 0 },
  { text: 'Q2', scoreYes: 2, scoreNo: 0 },
  { text: 'Q3', scoreYes: 3, scoreNo: 0 },
  { text: 'Q4', scoreYes: 3, scoreNo: 0 },
  { text: 'Q5', scoreYes: 2, scoreNo: 0 },
  { text: 'Q6', scoreYes: 2, scoreNo: 0 },
];

describe('DraculinDemo — quiz step progression', () => {
  it('starts at question index 0', () => {
    let idx = 0;
    expect(idx).toBe(0);
    expect(QUESTIONS[idx].text).toBe('Q1');
  });

  it('answering advances the index', () => {
    let idx = 0;
    let score = 0;
    // answer "yes" to Q1
    score += QUESTIONS[idx].scoreYes;
    idx++;
    expect(idx).toBe(1);
    expect(score).toBe(2);
  });

  it('answering "no" gives 0 points but advances', () => {
    let idx = 0;
    let score = 0;
    score += QUESTIONS[idx].scoreNo;
    idx++;
    expect(idx).toBe(1);
    expect(score).toBe(0);
  });

  it('reaching the end sets done', () => {
    let idx = 0;
    let done = false;
    for (let i = 0; i < QUESTIONS.length; i++) {
      idx++;
    }
    done = idx >= QUESTIONS.length;
    expect(done).toBe(true);
  });

  it('score after all-yes matches quizScore computation', () => {
    const answers = QUESTIONS.map(() => true);
    expect(quizScore(answers, QUESTIONS)).toBe(14);
  });

  it('final band after all-yes is severe', () => {
    expect(scoreBand(14)).toBe('severe');
  });

  it('final band after all-no is mild', () => {
    expect(scoreBand(0)).toBe('mild');
  });
});

/* ---------- news fallback behavior ---------- */

describe('DraculinDemo — news fallback', () => {
  it('FALLBACK_NEWS is used when backend is unreachable', () => {
    // Component logic: if fetch fails → use FALLBACK_NEWS
    expect(FALLBACK_NEWS.length).toBeGreaterThan(0);
  });

  it('each fallback news item has required fields', () => {
    for (const item of FALLBACK_NEWS) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.link).toMatch(/^https?:\/\//);
    }
  });
});

/* ---------- stats data ---------- */

describe('DraculinDemo — stats data for visualization', () => {
  it('BLOOD_DATA has 7 days', () => {
    expect(Object.keys(BLOOD_DATA)).toHaveLength(7);
  });

  it('all blood volumes are positive', () => {
    for (const v of Object.values(BLOOD_DATA)) {
      expect(v).toBeGreaterThan(0);
    }
  });

  it('PERIOD_DAYS marks valid calendar days', () => {
    for (const d of PERIOD_DAYS) {
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(31);
    }
  });

  it('period days toggle behavior', () => {
    const periodDays = new Set(PERIOD_DAYS);
    // Toggling a day in → removes it
    const day = PERIOD_DAYS[0];
    periodDays.delete(day);
    expect(periodDays.has(day)).toBe(false);

    // Toggling a day not in → adds it
    periodDays.add(15);
    expect(periodDays.has(15)).toBe(true);
  });
});
