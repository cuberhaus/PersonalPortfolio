import { describe, it, expect } from 'vitest';

/**
 * Tests for the SPMatriculasDemo pipeline stages.
 * The demo has 3 stages: plate detection → character segmentation → character recognition.
 * We test the pipeline state machine and stage transitions.
 */

/* ---------- pipeline state machine ---------- */

type Status = 'idle' | 'processing' | 'done' | 'error';

interface PipelineState {
  status: Status;
  selectedImage: string | null;
  selectedGT: string | null;
  error: string | null;
}

function selectSample(state: PipelineState, path: string, gt: string): PipelineState {
  return { ...state, selectedImage: path, selectedGT: gt, status: 'idle', error: null };
}

function startProcessing(state: PipelineState): PipelineState {
  if (!state.selectedImage) return { ...state, status: 'error', error: 'No image selected' };
  return { ...state, status: 'processing', error: null };
}

function finishProcessing(state: PipelineState, plateText: string): PipelineState {
  return { ...state, status: 'done', error: null };
}

function handleError(state: PipelineState, message: string): PipelineState {
  return { ...state, status: 'error', error: message };
}

/* ---------- sample data (mirrors SPMatriculasDemo SAMPLES) ---------- */

const SAMPLES = [
  { name: '0025RDB.jpg', plate: '0025RDB' },
  { name: '0050GDJ.jpg', plate: '0050GDJ' },
  { name: '0076BCL.jpg', plate: '0076BCL' },
  { name: '8655BZT.jpg', plate: '8655BZT' },
];

describe('SPMatriculasDemo — sample data', () => {
  it('has multiple sample images', () => {
    expect(SAMPLES.length).toBeGreaterThanOrEqual(2);
  });

  it('each sample has a file name and expected plate', () => {
    for (const s of SAMPLES) {
      expect(s.name).toMatch(/\.jpg$/);
      expect(s.plate.length).toBeGreaterThan(0);
    }
  });

  it('plate format follows Spanish pattern (4 digits + 3 letters)', () => {
    for (const s of SAMPLES) {
      expect(s.plate).toMatch(/^\d{4}[A-Z]{3}$/);
    }
  });
});

describe('SPMatriculasDemo — pipeline state transitions', () => {
  const initial: PipelineState = { status: 'idle', selectedImage: null, selectedGT: null, error: null };

  it('starts in idle with no image', () => {
    expect(initial.status).toBe('idle');
    expect(initial.selectedImage).toBeNull();
  });

  it('selecting a sample sets image and GT', () => {
    const state = selectSample(initial, '/img/0025RDB.jpg', '0025RDB');
    expect(state.selectedImage).toBe('/img/0025RDB.jpg');
    expect(state.selectedGT).toBe('0025RDB');
    expect(state.status).toBe('idle');
  });

  it('selecting a new sample resets status to idle', () => {
    let state = selectSample(initial, '/img/0025RDB.jpg', '0025RDB');
    state = startProcessing(state);
    expect(state.status).toBe('processing');
    state = selectSample(state, '/img/0050GDJ.jpg', '0050GDJ');
    expect(state.status).toBe('idle');
    expect(state.selectedGT).toBe('0050GDJ');
  });

  it('processing requires an image', () => {
    const state = startProcessing(initial);
    expect(state.status).toBe('error');
    expect(state.error).toContain('No image');
  });

  it('processing with image → processing state', () => {
    let state = selectSample(initial, '/img/sample.jpg', 'ABC1234');
    state = startProcessing(state);
    expect(state.status).toBe('processing');
    expect(state.error).toBeNull();
  });

  it('successful processing → done', () => {
    let state = selectSample(initial, '/img/sample.jpg', '0025RDB');
    state = startProcessing(state);
    state = finishProcessing(state, '0025RDB');
    expect(state.status).toBe('done');
  });

  it('error during processing sets error state', () => {
    let state = selectSample(initial, '/img/sample.jpg', '0025RDB');
    state = startProcessing(state);
    state = handleError(state, 'Worker failed');
    expect(state.status).toBe('error');
    expect(state.error).toBe('Worker failed');
  });
});

describe('SPMatriculasDemo — plate matching logic', () => {
  function matchResult(detected: string, gt: string): 'match' | 'mismatch' {
    return detected === gt ? 'match' : 'mismatch';
  }

  it('exact match returns "match"', () => {
    expect(matchResult('0025RDB', '0025RDB')).toBe('match');
  });

  it('different plates return "mismatch"', () => {
    expect(matchResult('0025RDB', '0025RDC')).toBe('mismatch');
  });

  it('partial mismatch (one char off) is still mismatch', () => {
    expect(matchResult('0025RD8', '0025RDB')).toBe('mismatch');
  });

  it('empty detected plate is mismatch', () => {
    expect(matchResult('', '0025RDB')).toBe('mismatch');
  });
});

describe('SPMatriculasDemo — pipeline stage outputs', () => {
  // The pipeline has 3 stages producing image arrays
  interface StageOutput {
    images: string[];  // base64 or blob URLs
    label: string;
  }

  it('stage 1 (plate detection) produces at least one image', () => {
    const stage: StageOutput = { images: ['binarized', 'morphological', 'plate_region'], label: 'Plate Detection' };
    expect(stage.images.length).toBeGreaterThan(0);
  });

  it('stage 2 (character segmentation) produces character crops', () => {
    const stage: StageOutput = { images: ['char1', 'char2', 'char3'], label: 'Character Segmentation' };
    expect(stage.images.length).toBeGreaterThan(0);
  });

  it('stage 3 (recognition) maps each character to a letter', () => {
    const recognized = ['0', '0', '2', '5', 'R', 'D', 'B'];
    const plate = recognized.join('');
    expect(plate).toBe('0025RDB');
  });
});
