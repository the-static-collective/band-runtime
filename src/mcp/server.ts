import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BandEvent } from '../events';
import {
  AdmissionDecision,
  AdmissionPolicy,
  ArtifactWriteAttempt,
  decideArtifactWriteAdmission,
} from '../admission';
import { evaluateArtifactWriteAdmissionInputSchema } from './schemas';

export const EVALUATE_ARTIFACT_WRITE_ADMISSION_TOOL =
  'evaluate_artifact_write_admission' as const;

export function evaluateArtifactWriteAdmission(input: unknown): AdmissionDecision {
  const parsed = evaluateArtifactWriteAdmissionInputSchema.parse(input);

  return decideArtifactWriteAdmission(
    parsed.history as BandEvent[],
    parsed.attempt as ArtifactWriteAttempt,
    parsed.policy as AdmissionPolicy,
  );
}

export function createBandRuntimeMcpServer(): McpServer {
  const server = new McpServer({
    name: 'band-runtime',
    version: '0.1.0',
  });

  server.registerTool(
    EVALUATE_ARTIFACT_WRITE_ADMISSION_TOOL,
    {
      title: 'Evaluate artifact write admission',
      description:
        'Evaluate one artifact.write attempt against caller-supplied Band Runtime history and policy. Returns the pure admission decision and performs no append, projection, indexing, retention, or external mutation.',
      inputSchema: evaluateArtifactWriteAdmissionInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => {
      const decision = evaluateArtifactWriteAdmission(input);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(decision),
          },
        ],
        structuredContent: decision,
      };
    },
  );

  return server;
}
