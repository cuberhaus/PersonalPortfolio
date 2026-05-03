// Note name to MIDI-like integer (0-51) mapping, matching the original Python
const NOTE_TO_INT: Record<string, number> = {};
const INT_TO_FREQ: Record<number, number> = {};

function initNotes() {
  const letters = ["A", "B", "C", "D", "E", "F", "G"];
  NOTE_TO_INT["A0"] = 0;
  NOTE_TO_INT["B0"] = 1;
  for (let i = 1; i < 8; i++) {
    for (let j = 0; j < 7; j++) {
      NOTE_TO_INT[letters[(j + 2) % 7] + String(i)] = j + (i - 1) * 7 + 2;
    }
  }
  NOTE_TO_INT["C8"] = 51;
  for (const l of letters) NOTE_TO_INT[l] = NOTE_TO_INT[l + "4"];

  // Map integers to frequencies: A0 = 27.5 Hz, using 12-TET
  // The mapping uses the 7-note scale (no sharps/flats)
  const baseNotes = [0, 2, 3, 5, 7, 8, 10]; // A B C D E F G semitones from A
  for (let n = 0; n <= 51; n++) {
    const octaveGroup = n < 2 ? 0 : Math.floor((n - 2) / 7) + 1;
    const noteInGroup = n < 2 ? n : (n - 2) % 7;
    const noteLetter = n < 2 ? n : noteInGroup;
    // Map to semitones from A0
    const letterOrder = [0, 1, 2, 3, 4, 5, 6]; // A B C D E F G
    const semitoneMap = [0, 2, 3, 5, 7, 8, 10];
    let semitones: number;
    if (n < 2) {
      semitones = semitoneMap[n];
    } else {
      semitones = semitoneMap[(noteInGroup + 2) % 7] + octaveGroup * 12;
      if ((noteInGroup + 2) % 7 < 2) semitones += 12;
      semitones -= 9; // adjust: C1 should be ~ octave 1
    }
    // A0 = 27.5 Hz, each semitone = 2^(1/12)
    INT_TO_FREQ[n] = 27.5 * Math.pow(2, semitones / 12);
  }
}
initNotes();

// ---------- Tokenizer ----------

type TokenType =
  | "NUM" | "NOTE" | "STRING" | "FUNC_ID" | "VAR_ID"
  | "OP" | "CMP" | "ASSIGN" | "LPAR" | "RPAR"
  | "LBRACE" | "RBRACE" | "LBRACKET" | "RBRACKET"
  | "PIPE_COLON" | "COLON_PIPE" | "PLAY" | "WRITE" | "READ"
  | "APPEND" | "CUT" | "HASH" | "NEWLINE" | "EOF"
  | "IF" | "ELSE" | "WHILE" | "COMMA";

interface Token {
  type: TokenType;
  value: string;
  line: number;
}

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;

  while (i < src.length) {
    // Skip spaces/tabs
    if (src[i] === " " || src[i] === "\t") { i++; continue; }

    // Comments ~~~ ... ~~~
    if (src.substring(i, i + 3) === "~~~") {
      i += 3;
      const end = src.indexOf("~~~", i);
      i = end === -1 ? src.length : end + 3;
      continue;
    }

    // Newline
    if (src[i] === "\r" && src[i + 1] === "\n") {
      tokens.push({ type: "NEWLINE", value: "\n", line });
      line++; i += 2; continue;
    }
    if (src[i] === "\n") {
      tokens.push({ type: "NEWLINE", value: "\n", line });
      line++; i++; continue;
    }

    // Multi-char tokens
    if (src.substring(i, i + 3) === "<:>") { tokens.push({ type: "PLAY", value: "<:>", line }); i += 3; continue; }
    if (src.substring(i, i + 3) === "<!>") { tokens.push({ type: "WRITE", value: "<!>", line }); i += 3; continue; }
    if (src.substring(i, i + 3) === "<?>") { tokens.push({ type: "READ", value: "<?>", line }); i += 3; continue; }
    if (src.substring(i, i + 2) === "|:") { tokens.push({ type: "PIPE_COLON", value: "|:", line }); i += 2; continue; }
    if (src.substring(i, i + 2) === ":|") { tokens.push({ type: "COLON_PIPE", value: ":|", line }); i += 2; continue; }
    if (src.substring(i, i + 2) === "<-") { tokens.push({ type: "ASSIGN", value: "<-", line }); i += 2; continue; }
    if (src.substring(i, i + 2) === "<<") { tokens.push({ type: "APPEND", value: "<<", line }); i += 2; continue; }
    if (src.substring(i, i + 2) === "8<") { tokens.push({ type: "CUT", value: "8<", line }); i += 2; continue; }
    if (src.substring(i, i + 2) === "/=") { tokens.push({ type: "CMP", value: "/=", line }); i += 2; continue; }
    if (src.substring(i, i + 2) === "<=") { tokens.push({ type: "CMP", value: "<=", line }); i += 2; continue; }
    if (src.substring(i, i + 2) === ">=") { tokens.push({ type: "CMP", value: ">=", line }); i += 2; continue; }

    // String
    if (src[i] === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== '"') j++;
      tokens.push({ type: "STRING", value: src.substring(i, j + 1), line });
      i = j + 1; continue;
    }

    // Single-char tokens
    if (src[i] === "(") { tokens.push({ type: "LPAR", value: "(", line }); i++; continue; }
    if (src[i] === ")") { tokens.push({ type: "RPAR", value: ")", line }); i++; continue; }
    if (src[i] === "{") { tokens.push({ type: "LBRACE", value: "{", line }); i++; continue; }
    if (src[i] === "}") { tokens.push({ type: "RBRACE", value: "}", line }); i++; continue; }
    if (src[i] === "[") { tokens.push({ type: "LBRACKET", value: "[", line }); i++; continue; }
    if (src[i] === "]") { tokens.push({ type: "RBRACKET", value: "]", line }); i++; continue; }
    if (src[i] === "#") {
      // #varname -> HASH token
      let j = i + 1;
      while (j < src.length && /[a-zA-Z0-9_]/.test(src[j])) j++;
      tokens.push({ type: "HASH", value: src.substring(i + 1, j), line });
      i = j; continue;
    }
    if ("=<>".includes(src[i])) { tokens.push({ type: "CMP", value: src[i], line }); i++; continue; }
    if ("+-*/%^".includes(src[i])) { tokens.push({ type: "OP", value: src[i], line }); i++; continue; }

    // Numbers
    if (/[0-9]/.test(src[i])) {
      let j = i;
      while (j < src.length && /[0-9]/.test(src[j])) j++;
      tokens.push({ type: "NUM", value: src.substring(i, j), line });
      i = j; continue;
    }

    // Identifiers / Notes / Keywords
    if (/[a-zA-Z]/.test(src[i])) {
      let j = i;
      while (j < src.length && /[a-zA-Z0-9_]/.test(src[j])) j++;
      const word = src.substring(i, j);

      if (word === "if") { tokens.push({ type: "IF", value: word, line }); }
      else if (word === "else") { tokens.push({ type: "ELSE", value: word, line }); }
      else if (word === "while") { tokens.push({ type: "WHILE", value: word, line }); }
      else if (word in NOTE_TO_INT) { tokens.push({ type: "NOTE", value: word, line }); }
      else if (/^[A-Z]/.test(word)) { tokens.push({ type: "FUNC_ID", value: word, line }); }
      else { tokens.push({ type: "VAR_ID", value: word, line }); }

      i = j; continue;
    }

    i++; // skip unknown
  }

  tokens.push({ type: "EOF", value: "", line });
  return tokens;
}

// ---------- Parser ----------

interface ASTNode {
  type: string;
  [key: string]: unknown;
}

class Parser {
  tokens: Token[];
  pos: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek(): Token { return this.tokens[this.pos] ?? { type: "EOF", value: "", line: 0 }; }
  advance(): Token { return this.tokens[this.pos++]; }
  expect(type: TokenType): Token {
    const t = this.advance();
    if (t.type !== type) throw new Error(`Expected ${type} but got ${t.type} ("${t.value}") at line ${t.line}`);
    return t;
  }

  skipNewlines() { while (this.peek().type === "NEWLINE") this.advance(); }
  expectNewlines() {
    if (this.peek().type !== "NEWLINE" && this.peek().type !== "EOF") {
      throw new Error(`Expected newline at line ${this.peek().line}, got ${this.peek().type}`);
    }
    while (this.peek().type === "NEWLINE") this.advance();
  }

  parse(): ASTNode {
    const stmts: ASTNode[] = [];
    this.skipNewlines();
    while (this.peek().type !== "EOF") {
      stmts.push(this.parseStatement());
      this.skipNewlines();
    }
    return { type: "program", body: stmts };
  }

  parseBlock(): ASTNode[] {
    const stmts: ASTNode[] = [];
    this.skipNewlines();
    while (this.peek().type !== "COLON_PIPE" && this.peek().type !== "EOF") {
      stmts.push(this.parseStatement());
      this.skipNewlines();
    }
    return stmts;
  }

  parseStatement(): ASTNode {
    const t = this.peek();

    if (t.type === "IF") return this.parseIf();
    if (t.type === "WHILE") return this.parseWhile();
    if (t.type === "PLAY") return this.parsePlay();
    if (t.type === "WRITE") return this.parseWrite();
    if (t.type === "READ") return this.parseRead();
    if (t.type === "CUT") return this.parseCut();

    if (t.type === "FUNC_ID") {
      // Check if procedure declaration or call
      const saved = this.pos;
      this.advance(); // consume FUNC_ID
      // Collect potential args
      const args: string[] = [];
      while (this.peek().type === "VAR_ID") {
        args.push(this.advance().value);
      }
      if (this.peek().type === "PIPE_COLON") {
        // Procedure declaration
        this.advance(); // |:
        this.expectNewlines();
        const body = this.parseBlock();
        this.expect("COLON_PIPE");
        this.skipNewlines();
        return { type: "proc_decl", name: t.value, params: args, body };
      }
      // Procedure call - args might be expressions, reparse
      this.pos = saved;
      return this.parseProcCall();
    }

    if (t.type === "VAR_ID") {
      const saved = this.pos;
      const name = this.advance().value;
      if (this.peek().type === "ASSIGN") {
        this.advance(); // <-
        let value: ASTNode;
        if (this.peek().type === "LBRACE") {
          value = this.parseList();
        } else {
          value = this.parseExprOrCond();
        }
        this.expectNewlines();
        return { type: "assign", name, value };
      }
      if (this.peek().type === "APPEND") {
        this.advance(); // <<
        const value = this.parseExpr();
        this.expectNewlines();
        return { type: "append", name, value };
      }
      this.pos = saved;
    }

    // Fallthrough: skip newlines or unknown
    if (t.type === "NEWLINE") { this.advance(); return { type: "noop" }; }
    throw new Error(`Unexpected token ${t.type} ("${t.value}") at line ${t.line}`);
  }

  parseExprOrCond(): ASTNode {
    const left = this.parseExpr();
    const t = this.peek();
    if (t.type === "CMP") {
      const op = this.advance().value;
      const right = this.parseExpr();
      return { type: "cmp", op, left, right };
    }
    return left;
  }

  parseIf(): ASTNode {
    this.expect("IF");
    const cond = this.parseCond();
    this.expect("PIPE_COLON");
    this.expectNewlines();
    const body = this.parseBlock();
    this.expect("COLON_PIPE");
    let elseBody: ASTNode[] | undefined;
    this.skipNewlines();
    if (this.peek().type === "ELSE") {
      this.advance();
      this.expect("PIPE_COLON");
      this.expectNewlines();
      elseBody = this.parseBlock();
      this.expect("COLON_PIPE");
      this.skipNewlines();
    }
    return { type: "if", cond, body, elseBody };
  }

  parseWhile(): ASTNode {
    this.expect("WHILE");
    const cond = this.parseCond();
    this.expect("PIPE_COLON");
    this.expectNewlines();
    const body = this.parseBlock();
    this.expect("COLON_PIPE");
    this.skipNewlines();
    return { type: "while", cond, body };
  }

  parseCond(): ASTNode {
    const left = this.parseExpr();
    const op = this.expect("CMP").value;
    const right = this.parseExpr();
    return { type: "cmp", op, left, right };
  }

  parsePlay(): ASTNode {
    this.expect("PLAY");
    const value = this.parseExpr();
    this.expectNewlines();
    return { type: "play", value };
  }

  parseWrite(): ASTNode {
    this.expect("WRITE");
    const args: ASTNode[] = [];
    while (this.peek().type !== "NEWLINE" && this.peek().type !== "EOF") {
      if (this.peek().type === "STRING") {
        args.push({ type: "string", value: this.advance().value.slice(1, -1) });
      } else {
        args.push(this.parseExpr());
      }
    }
    this.expectNewlines();
    return { type: "write", args };
  }

  parseRead(): ASTNode {
    this.expect("READ");
    const name = this.expect("VAR_ID").value;
    this.expectNewlines();
    return { type: "read", name };
  }

  parseCut(): ASTNode {
    this.expect("CUT");
    const name = this.expect("VAR_ID").value;
    this.expect("LBRACKET");
    const index = this.parseExpr();
    this.expect("RBRACKET");
    this.expectNewlines();
    return { type: "cut", name, index };
  }

  parseProcCall(): ASTNode {
    const name = this.expect("FUNC_ID").value;
    const args: ASTNode[] = [];
    while (this.peek().type !== "NEWLINE" && this.peek().type !== "EOF" &&
           this.peek().type !== "COLON_PIPE") {
      args.push(this.parseExpr());
    }
    if (this.peek().type === "NEWLINE") this.expectNewlines();
    return { type: "proc_call", name, args };
  }

  parseList(): ASTNode {
    this.expect("LBRACE");
    const items: ASTNode[] = [];
    while (this.peek().type !== "RBRACE") {
      items.push(this.parseExpr());
    }
    this.expect("RBRACE");
    return { type: "list", items };
  }

  parseExpr(): ASTNode { return this.parseAddSub(); }

  parseAddSub(): ASTNode {
    let left = this.parseMulDiv();
    while (this.peek().type === "OP" && (this.peek().value === "+" || this.peek().value === "-")) {
      const op = this.advance().value;
      const right = this.parseMulDiv();
      left = { type: "binop", op, left, right };
    }
    return left;
  }

  parseMulDiv(): ASTNode {
    let left = this.parsePow();
    while (this.peek().type === "OP" && ("*/%".includes(this.peek().value))) {
      const op = this.advance().value;
      const right = this.parsePow();
      left = { type: "binop", op, left, right };
    }
    return left;
  }

  parsePow(): ASTNode {
    const base = this.parseAtom();
    if (this.peek().type === "OP" && this.peek().value === "^") {
      this.advance();
      const exp = this.parsePow(); // right-associative
      return { type: "binop", op: "^", left: base, right: exp };
    }
    return base;
  }

  parseAtom(): ASTNode {
    const t = this.peek();

    if (t.type === "NUM") { this.advance(); return { type: "num", value: parseInt(t.value) }; }
    if (t.type === "NOTE") { this.advance(); return { type: "num", value: NOTE_TO_INT[t.value] }; }
    if (t.type === "HASH") { this.advance(); return { type: "list_size", name: t.value }; }

    if (t.type === "VAR_ID") {
      this.advance();
      if (this.peek().type === "LBRACKET") {
        this.advance();
        const index = this.parseExpr();
        this.expect("RBRACKET");
        return { type: "list_access", name: t.value, index };
      }
      return { type: "var", name: t.value };
    }

    if (t.type === "LPAR") {
      this.advance();
      const expr = this.parseExpr();
      this.expect("RPAR");
      return expr;
    }

    throw new Error(`Unexpected token in expression: ${t.type} ("${t.value}") at line ${t.line}`);
  }
}

// ---------- Interpreter ----------

export interface JSBachResult {
  output: string[];
  notes: number[];
  error?: string;
}

export function interpret(source: string, inputValues: number[] = []): JSBachResult {
  const output: string[] = [];
  const notes: number[] = [];
  let inputIdx = 0;

  try {
    const tokens = tokenize(source);
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const procs: Record<string, { params: string[]; body: ASTNode[] }> = {};
    const stmts = ast.body as ASTNode[];

    // First pass: collect procedure declarations
    for (const stmt of stmts) {
      if (stmt.type === "proc_decl") {
        procs[stmt.name as string] = {
          params: stmt.params as string[],
          body: stmt.body as ASTNode[],
        };
      }
    }

    function evalExpr(node: ASTNode, scope: Record<string, unknown>): unknown {
      switch (node.type) {
        case "num": return node.value as number;
        case "var": {
          const v = scope[node.name as string];
          if (v === undefined) throw new Error(`Undefined variable: ${node.name}`);
          return v;
        }
        case "binop": {
          const l = evalExpr(node.left as ASTNode, scope) as number;
          const r = evalExpr(node.right as ASTNode, scope) as number;
          switch (node.op) {
            case "+": return l + r;
            case "-": return l - r;
            case "*": return l * r;
            case "/": return r === 0 ? 0 : Math.floor(l / r);
            case "%": return l % r;
            case "^": return Math.pow(l, r);
          }
          return 0;
        }
        case "cmp": {
          const l = evalExpr(node.left as ASTNode, scope) as number;
          const r = evalExpr(node.right as ASTNode, scope) as number;
          switch (node.op) {
            case "=": return l === r ? 1 : 0;
            case "/=": return l !== r ? 1 : 0;
            case "<": return l < r ? 1 : 0;
            case ">": return l > r ? 1 : 0;
            case "<=": return l <= r ? 1 : 0;
            case ">=": return l >= r ? 1 : 0;
          }
          return 0;
        }
        case "list": {
          return (node.items as ASTNode[]).map((item) => evalExpr(item, scope));
        }
        case "list_access": {
          const list = scope[node.name as string] as number[];
          const idx = evalExpr(node.index as ASTNode, scope) as number;
          return list[idx - 1];
        }
        case "list_size": {
          const list = scope[node.name as string] as number[];
          return list.length;
        }
        case "string": return node.value;
      }
      return 0;
    }

    function execBlock(block: ASTNode[], scope: Record<string, unknown>) {
      let steps = 0;
      for (const stmt of block) {
        execStmt(stmt, scope);
        if (++steps > 100000) throw new Error("Execution limit exceeded (infinite loop?)");
      }
    }

    function execStmt(node: ASTNode, scope: Record<string, unknown>) {
      switch (node.type) {
        case "noop":
        case "proc_decl":
          break;
        case "assign": {
          const val = evalExpr(node.value as ASTNode, scope);
          scope[node.name as string] = val;
          break;
        }
        case "play": {
          const val = evalExpr(node.value as ASTNode, scope);
          if (Array.isArray(val)) {
            for (const n of val) notes.push(n as number);
          } else {
            notes.push(val as number);
          }
          break;
        }
        case "write": {
          const parts: string[] = [];
          for (const arg of node.args as ASTNode[]) {
            const val = evalExpr(arg, scope);
            if (Array.isArray(val)) parts.push(JSON.stringify(val));
            else parts.push(String(val));
          }
          output.push(parts.join(" "));
          break;
        }
        case "read": {
          const val = inputIdx < inputValues.length ? inputValues[inputIdx++] : 0;
          scope[node.name as string] = val;
          break;
        }
        case "if": {
          const cond = evalExpr(node.cond as ASTNode, scope);
          if (cond) execBlock(node.body as ASTNode[], scope);
          else if (node.elseBody) execBlock(node.elseBody as ASTNode[], scope);
          break;
        }
        case "while": {
          let iters = 0;
          while (evalExpr(node.cond as ASTNode, scope)) {
            execBlock(node.body as ASTNode[], scope);
            if (++iters > 10000) throw new Error("Loop limit exceeded");
          }
          break;
        }
        case "proc_call": {
          const proc = procs[node.name as string];
          if (!proc) throw new Error(`Undefined procedure: ${node.name}`);
          const argVals = (node.args as ASTNode[]).map((a) => evalExpr(a, scope));
          const newScope: Record<string, unknown> = {};
          proc.params.forEach((p, i) => { newScope[p] = argVals[i] ?? 0; });
          execBlock(proc.body, newScope);
          break;
        }
        case "append": {
          const list = scope[node.name as string] as number[];
          const val = evalExpr(node.value as ASTNode, scope);
          list.push(val as number);
          break;
        }
        case "cut": {
          const list = scope[node.name as string] as number[];
          const idx = evalExpr(node.index as ASTNode, scope) as number;
          list.splice(idx - 1, 1);
          break;
        }
      }
    }

    // Execute: first run all top-level declarations, then call Main
    for (const stmt of stmts) {
      if (stmt.type === "proc_decl") {
        procs[stmt.name as string] = {
          params: stmt.params as string[],
          body: stmt.body as ASTNode[],
        };
      }
    }

    if (!procs["Main"]) throw new Error('No "Main" procedure found');
    execBlock(procs["Main"].body, {});

  } catch (e) {
    return { output, notes, error: (e as Error).message };
  }

  return { output, notes };
}

// ---------- Audio Playback ----------

export function playNotes(
  noteInts: number[],
  tempo = 120,
  onTick?: (info: { pitch: number; freq: number; idx: number; dur: number }) => void,
): Promise<void> {
  return new Promise((resolve) => {
    if (noteInts.length === 0) { resolve(); return; }
    const ctx = new AudioContext();
    const beatDuration = 60 / tempo;

    noteInts.forEach((n, i) => {
      const freq = INT_TO_FREQ[n] ?? 440;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + i * beatDuration);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (i + 0.9) * beatDuration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * beatDuration);
      osc.stop(ctx.currentTime + (i + 1) * beatDuration);
      if (onTick) {
        setTimeout(() => onTick({ pitch: n, freq, idx: i, dur: beatDuration }), i * beatDuration * 1000);
      }
    });

    setTimeout(() => {
      ctx.close();
      resolve();
    }, noteInts.length * beatDuration * 1000 + 200);
  });
}

export const SAMPLE_PROGRAMS = [
  {
    name: "Happy Birthday",
    code: `Main |:
  <:> C
  <:> C
  <:> D
  <:> C
  <:> F
  <:> E
  <:> C
  <:> C
  <:> D
  <:> C
  <:> G
  <:> F
  <:> C
  <:> C
  <:> C5
  <:> A
  <:> F
  <:> E
  <:> D
:|
`,
  },
  {
    name: "Scale",
    code: `Main |:
  n <- 0
  while n < 8 |:
    <:> n * 7 + 2
    n <- n + 1
  :|
:|
`,
  },
  {
    name: "Fibonacci Notes",
    code: `Fib n |:
  a <- 0
  b <- 1
  i <- 0
  while i < n |:
    <:> (a % 14) + 16
    c <- a + b
    a <- b
    b <- c
    i <- i + 1
  :|
:|

Main |:
  Fib 16
:|
`,
  },
  {
    name: "Simple Song",
    code: `Main |:
  <!> "Playing a simple melody"
  notes <- {E4 D4 C4 D4 E4 E4 E4}
  <:> notes
  notes2 <- {D4 D4 D4 E4 G4 G4}
  <:> notes2
:|
`,
  },
];
