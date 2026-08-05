import { z } from 'zod';

const baseEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  timestamp: z.number().finite(),
  sessionId: z.string().min(1),
  sequence: z.number().int().nonnegative().optional(),
  payload: z.unknown(),
}).strict();

export const artifactWriteAttemptSchema = z.object({
  id: z.string().min(1),
  timestamp: z.number().finite(),
  sessionId: z.string().min(1),
  actorId: z.string().min(1),
  actorLocalSequence: z.number().int().nonnegative(),
  causalCutId: z.string().min(1),
  targetArtifactRef: z.string().min(1),
  attemptedEffect: z.literal('artifact.write'),
  payloadHash: z.string().min(1),
  payload: z.unknown().optional(),
}).strict();

export const admissionPolicySchema = z.object({
  ref: z.string().min(1),
  version: z.string().min(1),
  inputHash: z.string().min(1),
  evaluatorVersion: z.string().min(1),
  refusalAudience: z.array(z.string().min(1)).min(1),
}).strict();

export const evaluateArtifactWriteAdmissionInputSchema = z.object({
  history: z.array(baseEventSchema),
  attempt: artifactWriteAttemptSchema,
  policy: admissionPolicySchema,
}).strict();

export type EvaluateArtifactWriteAdmissionInput = z.infer<
  typeof evaluateArtifactWriteAdmissionInputSchema
>;
