import { describe, it, expect } from 'vitest';
import { AIRPORTS_RAW, ROUTES_ADJ, getAirports, getRoutes } from '../lib/caim/airports-data';
import { getCorpusData, CORPUS_LABELS, type CorpusId } from '../lib/caim/zipf-data';

// --- Airport data integrity ---

describe('Airport data', () => {
  it('has at least 100 airports', () => {
    expect(AIRPORTS_RAW.length).toBeGreaterThanOrEqual(100);
  });

  it('every airport tuple has 5 fields', () => {
    for (const tuple of AIRPORTS_RAW) {
      expect(tuple).toHaveLength(5);
    }
  });

  it('every airport has a 3-char IATA code', () => {
    for (const [code] of AIRPORTS_RAW) {
      expect(code).toMatch(/^[A-Z]{3}$/);
    }
  });

  it('airport codes are unique', () => {
    const codes = AIRPORTS_RAW.map(([code]) => code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('every airport has valid lat/lon', () => {
    for (const [code, , , lat, lon] of AIRPORTS_RAW) {
      expect(lat, `${code} lat out of range`).toBeGreaterThanOrEqual(-90);
      expect(lat, `${code} lat out of range`).toBeLessThanOrEqual(90);
      expect(lon, `${code} lon out of range`).toBeGreaterThanOrEqual(-180);
      expect(lon, `${code} lon out of range`).toBeLessThanOrEqual(180);
    }
  });

  it('every airport has a non-empty name and country', () => {
    for (const [code, name, country] of AIRPORTS_RAW) {
      expect(name.length, `${code} has empty name`).toBeGreaterThan(0);
      expect(country.length, `${code} has empty country`).toBeGreaterThan(0);
    }
  });

  it('getAirports() returns parsed objects', () => {
    const airports = getAirports();
    expect(airports.length).toBe(AIRPORTS_RAW.length);
    expect(airports[0]).toHaveProperty('code');
    expect(airports[0]).toHaveProperty('lat');
    expect(airports[0]).toHaveProperty('lon');
  });
});

describe('Route data', () => {
  const airportCodes = new Set(AIRPORTS_RAW.map(([code]) => code));

  it('has at least 1000 routes', () => {
    const routes = getRoutes();
    expect(routes.length).toBeGreaterThanOrEqual(1000);
  });

  it('every route references valid airport codes', () => {
    const routes = getRoutes();
    for (const [src, dst] of routes) {
      expect(airportCodes.has(src), `unknown source: ${src}`).toBe(true);
      expect(airportCodes.has(dst), `unknown dest: ${dst}`).toBe(true);
    }
  });

  it('no self-loops in routes', () => {
    const routes = getRoutes();
    for (const [src, dst] of routes) {
      expect(src, `self-loop: ${src}`).not.toBe(dst);
    }
  });

  it('ROUTES_ADJ keys are all valid airport codes', () => {
    for (const src of Object.keys(ROUTES_ADJ)) {
      expect(airportCodes.has(src), `unknown adjacency key: ${src}`).toBe(true);
    }
  });
});

// --- Zipf data integrity ---

describe('Zipf corpus data', () => {
  const CORPUS_IDS: CorpusId[] = ['novels', 'news', 'abstracts'];

  it('all 3 corpora are present in labels', () => {
    for (const id of CORPUS_IDS) {
      expect(CORPUS_LABELS[id]).toBeTruthy();
    }
  });

  for (const id of CORPUS_IDS) {
    describe(`${id} corpus`, () => {
      it('has at least 50 entries', () => {
        const data = getCorpusData(id);
        expect(data.length).toBeGreaterThanOrEqual(50);
      });

      it('frequencies are positive', () => {
        const data = getCorpusData(id);
        for (const entry of data) {
          expect(entry.frequency).toBeGreaterThan(0);
        }
      });

      it('frequencies are sorted descending', () => {
        const data = getCorpusData(id);
        for (let i = 1; i < data.length; i++) {
          expect(data[i].frequency, `${id}[${i}] not sorted`).toBeLessThanOrEqual(data[i - 1].frequency);
        }
      });

      it('words are non-empty strings', () => {
        const data = getCorpusData(id);
        for (const entry of data) {
          expect(entry.word.length).toBeGreaterThan(0);
        }
      });
    });
  }
});
