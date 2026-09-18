import { admitHelpSlipCarrier } from './envelope';
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
    const prior = this.getReceives();
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
    const receives = this.getReceives(caseId);
    return projectHelpCase(
      caseId,
      receives,
      this.getValidatedEvents(caseId, receives),
    );
  }

  getReceives(caseId?: string): ReceivedHelpSlip[] {
    const all = this.validateReceives(this.ledger.loadReceives());
    return caseId === undefined
      ? all
      : all.filter((receipt) => receipt.caseId === caseId);
  }

  getEvents(caseId?: string): HelpCaseEvent[] {
    if (caseId === undefined) {
      const receives = this.getReceives();
      const cases = new Set(
        receives
          .map((receipt) => receipt.caseId)
          .filter((value): value is string => value !== undefined),
      );
      return [...cases].flatMap((id) =>
        this.getValidatedEvents(
          id,
          receives.filter((receipt) => receipt.caseId === id),
        ),
      );
    }

    const receives = this.getReceives(caseId);
    return this.getValidatedEvents(caseId, receives);
  }

  private validateReceives(
    receives: readonly ReceivedHelpSlip[],
  ): ReceivedHelpSlip[] {
    const seenOccurrences = new Set<string>();

    for (const receipt of receives) {
      if (
        typeof receipt.occurrenceId !== 'string' ||
        receipt.occurrenceId.length === 0 ||
        seenOccurrences.has(receipt.occurrenceId)
      ) {
        throw new Error('INVALID_HELP_SLIP_RECEIPT');
      }
      seenOccurrences.add(receipt.occurrenceId);

      if (receipt.admission === 'admitted') {
        if (!receipt.payload || !receipt.payloadHash || !receipt.caseId) {
          throw new Error('INVALID_HELP_SLIP_RECEIPT');
        }

        const readmission = admitHelpSlipCarrier(JSON.stringify(receipt.payload));
        if (
          readmission.disposition !== 'admitted' ||
          readmission.payloadHash !== receipt.payloadHash ||
          receipt.caseId !== `help-case:${receipt.payloadHash}`
        ) {
          throw new Error('INVALID_HELP_SLIP_RECEIPT');
        }
      } else if (
        receipt.caseId !== undefined ||
        receipt.payload !== undefined ||
        receipt.payloadHash !== undefined
      ) {
        throw new Error('INVALID_HELP_SLIP_RECEIPT');
      }
    }

    return [...receives];
  }

  private getValidatedEvents(
    caseId: string,
    receives: readonly ReceivedHelpSlip[],
  ): HelpCaseEvent[] {
    const events = this.ledger
      .loadEvents()
      .filter((event) => event.caseId === caseId);
    const prior: HelpCaseEvent[] = [];

    for (const event of events) {
      validateHelpCaseEvent(event, {
        caseId,
        receives,
        priorEvents: prior,
      });
      prior.push(event);
    }

    return events;
  }
}
