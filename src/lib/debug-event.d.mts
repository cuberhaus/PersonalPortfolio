export type DebugIngressLevel = 'trace' | 'info' | 'warn' | 'error';
export type DebugIngressSource = 'iframe' | 'backend';

export interface NormalizeDebugEventOptions {
  source: DebugIngressSource;
  origin: string;
  namespacePrefix: string;
  defaultNamespace: string;
  defaultLevel?: DebugIngressLevel;
  fallbackMessage?: string;
  expectedType?: string;
  allowPlainText?: boolean;
  requireLevel?: boolean;
  requireNamespace?: boolean;
  requireMessage?: boolean;
  requireArgsArray?: boolean;
  now?: () => number;
}

export interface NormalizedDebugEvent {
  source: DebugIngressSource;
  origin: string;
  level: DebugIngressLevel;
  ns: string;
  msg: string;
  args: unknown[];
  ts: number;
}

export declare const DEBUG_LEVELS: readonly DebugIngressLevel[];

export declare function normalizeDebugEvent(
  value: unknown,
  options: NormalizeDebugEventOptions
): NormalizedDebugEvent | null;
