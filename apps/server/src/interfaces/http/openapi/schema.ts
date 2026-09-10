import type { ConditionalSchemaConverter, JSONSchema } from "@orpc/openapi";
import type { Schema } from "@orpc/server";

// Metadados de documentação para os validadores TypeScript já usados pelas procedures.
const schemas = new WeakMap<object, JSONSchema>();

export function documented<TInput, TOutput>(
  schema: Schema<TInput, TOutput>,
  jsonSchema: JSONSchema
) {
  schemas.set(schema, jsonSchema);
  return schema;
}

export const schemaConverter: ConditionalSchemaConverter = {
  condition: (schema) => !!schema && schemas.has(schema),
  convert(schema) {
    const jsonSchema = schema && schemas.get(schema);
    if (!jsonSchema) {
      throw new Error("Schema OpenAPI não registrado.");
    }
    return [true, jsonSchema];
  },
};
