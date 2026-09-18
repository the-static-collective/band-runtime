import {
  validateHelpCaseEvent,
  type HelpCaseEvent,
} from './events';
import { HelpCaseLedger } from './ledger';
import {
  projectHelpCase,
  type HelpCaseProjection,
} from './projection';
import {
  receiveHelpSlip,
  type ReceiveHelpSlipResult,
  type ReceiveMetadata,
  type ReceivedHelpSlip,
} from './receive';

export class HoldingBasketRuntime {
  private readonly ledger: HelpCaseLedger;

  constructor(rootDir: string) {
    this.ledger = new HelpCaseLedger(rootDir);
  }

  receive(rawText: string, metadata: ReceiveMetadata): ReceiveHelpSlipResult {
    const prior = this.ledger.loadReceives();
    const result = receiveHelpSlip(rawText, metadata, prior);
    this.ledger.appendReceive(result.receipt);
    return result;
  }

  record(event: HelpCaseEvent): void {
    const receives = this.getReceives(event.caseId);
    const priorEvents = this.getEvents(event.caseId);

    validateHelpCaseEvent(event, {
      caseId: event.caseId,
      receives,
      priorEvents,
    });

    this.ledger.appendEvent(event);
  }

  getProjection(caseId: string): HelpCaseProjection {
    return projectHelpCase(
      caseId,
      this.getReceives(caseId),
      this.getEvents(caseId),
    );
  }

  getReceives(caseId?: string): ReceivedHelpSlip[] {
    const all = this.ledger.loadReceives();
    return caseId === undefined
      ? all
      : all.filter((receipt) => receipt.caseId === caseId);
  }

  getEvents(caseId?: string): HelpCaseEvent[] {
    const all = this.ledger.loadEvents();
    return caseId === undefined
      ? all
      : all.filter((event) => event.caseId === caseId);
  }
}
