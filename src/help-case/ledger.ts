import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
} from 'node:fs';
import { join } from 'node:path';
import type { HelpCaseEvent } from './events';
import type { ReceivedHelpSlip } from './receive';

export class HelpCaseLedger {
  private readonly receivesPath: string;
  private readonly eventsPath: string;

  constructor(rootDir: string) {
    mkdirSync(rootDir, { recursive: true });
    this.receivesPath = join(rootDir, 'receives.jsonl');
    this.eventsPath = join(rootDir, 'events.jsonl');
  }

  appendReceive(receipt: ReceivedHelpSlip): void {
    appendFileSync(this.receivesPath, `${JSON.stringify(receipt)}\n`, 'utf8');
  }

  appendEvent(event: HelpCaseEvent): void {
    appendFileSync(this.eventsPath, `${JSON.stringify(event)}\n`, 'utf8');
  }

  loadReceives(): ReceivedHelpSlip[] {
    return this.readJsonLines<ReceivedHelpSlip>(this.receivesPath);
  }

  loadEvents(): HelpCaseEvent[] {
    return this.readJsonLines<HelpCaseEvent>(this.eventsPath);
  }

  private readJsonLines<T>(path: string): T[] {
    if (!existsSync(path)) return [];
    const text = readFileSync(path, 'utf8');
    if (text.length === 0) return [];

    try {
      return text
        .split('\n')
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line) as T);
    } catch {
      throw new Error('MALFORMED_HELP_CASE_LEDGER');
    }
  }
}
