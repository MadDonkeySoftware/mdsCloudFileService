import type { FastifyRequest } from 'fastify';
import { kFileSavedPaths } from 'fastify-formidable';
import { rm } from 'fs/promises';

export async function getFileUploadAndFormFields(
  request: FastifyRequest,
  {
    fields,
  }: {
    fields: { key: string; required?: boolean }[];
  },
) {
  const validationErrors: string[] = [];
  const fieldValues: Record<string, unknown> = {};

  const formFields = await request.parseMultipart();

  const requestFiles = request[kFileSavedPaths] || [];

  for (const field of fields) {
    const fieldValue = formFields[field.key];
    if (!fieldValue && field.required) {
      validationErrors.push(`${field.key} missing from payload`);
    } else {
      fieldValues[field.key] = fieldValue;
    }
  }

  return {
    validationErrors,
    fieldValues,
    cleanupCallback: async () => {
      const tasks = requestFiles.map((file) => rm(file));
      const settled = await Promise.allSettled(tasks);
      // Log any errors that occurred during cleanup
      settled.forEach((result) => {
        if (result.status === 'rejected') {
          request.log.error({ err: result.reason }, 'Failed to delete file');
        }
      });
    },
  };
}
