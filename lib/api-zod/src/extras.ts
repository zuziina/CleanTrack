import { z } from "zod/v4";

export const RequestUploadUrlBody = z.object({
  name: z.string(),
  size: z.number(),
  contentType: z.string(),
});

export const RequestUploadUrlResponse = z.object({
  uploadURL: z.string(),
  objectPath: z.string(),
  metadata: z.object({
    name: z.string(),
    size: z.number(),
    contentType: z.string(),
  }),
});

export const IssuePhotoItem = z.object({
  id: z.number(),
  assignmentId: z.number(),
  companyId: z.number(),
  objectPath: z.string(),
  description: z.string().nullable(),
  uploadedByClerkId: z.string(),
  uploadedAt: z.string(),
  expiresAt: z.string(),
});
export type IssuePhotoItemType = z.infer<typeof IssuePhotoItem>;
