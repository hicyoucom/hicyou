export const translationEntityTypes = [
  "bookmark",
  "category",
  "collection",
] as const;

export type TranslationEntityType = (typeof translationEntityTypes)[number];

export type TranslationEntity = Record<string, unknown> & { id: number };

export const translationFields: Record<
  TranslationEntityType,
  readonly string[]
> = {
  bookmark: ["title", "description", "overview", "whyStartups"],
  category: ["name", "description"],
  collection: ["title", "description", "content"],
};

function addString(
  output: Record<string, string>,
  key: string,
  value: unknown,
): void {
  if (typeof value === "string" && value.trim()) output[key] = value;
}

/**
 * Build the exact flattened source fields that must be translated together.
 * Completion checks use this same function, so they cannot drift from writes.
 */
export function buildTranslationTexts(
  entityType: TranslationEntityType,
  entity: TranslationEntity,
  requestedFields: readonly string[] = translationFields[entityType],
): Record<string, string> {
  const allowedFields = new Set(translationFields[entityType]);
  const output: Record<string, string> = {};

  for (const field of requestedFields) {
    if (allowedFields.has(field)) addString(output, field, entity[field]);
  }

  if (entityType !== "bookmark") return output;

  if (Array.isArray(entity.keyFeatures)) {
    entity.keyFeatures.forEach((feature, index) => {
      if (typeof feature === "string") {
        addString(output, `keyFeatures.${index}`, feature);
        return;
      }
      if (!feature || typeof feature !== "object") return;
      const item = feature as Record<string, unknown>;
      addString(output, `keyFeatures.${index}.name`, item.name);
      addString(output, `keyFeatures.${index}.description`, item.description);
    });
  }

  if (Array.isArray(entity.useCases)) {
    entity.useCases.forEach((useCase, index) => {
      addString(output, `useCases.${index}`, useCase);
    });
  }

  if (Array.isArray(entity.faqs)) {
    entity.faqs.forEach((faq, index) => {
      if (!faq || typeof faq !== "object") return;
      const item = faq as Record<string, unknown>;
      addString(output, `faqs.${index}.question`, item.question);
      addString(output, `faqs.${index}.answer`, item.answer);
    });
  }

  return output;
}

export function isTranslationComplete(
  entityType: TranslationEntityType,
  entity: TranslationEntity,
  translatedFields: ReadonlySet<string>,
): boolean {
  return Object.keys(buildTranslationTexts(entityType, entity)).every((field) =>
    translatedFields.has(field),
  );
}

export function isTranslationFieldKey(
  entityType: TranslationEntityType,
  field: string,
): boolean {
  if (translationFields[entityType].includes(field)) return true;
  if (entityType !== "bookmark") return false;
  return /^(?:keyFeatures\.\d+(?:\.(?:name|description))?|useCases\.\d+|faqs\.\d+\.(?:question|answer))$/.test(
    field,
  );
}

export function translationEntityName(
  entityType: TranslationEntityType,
  entity: TranslationEntity,
): string {
  const value = entityType === "category" ? entity.name : entity.title;
  return typeof value === "string" && value.trim()
    ? value
    : `${entityType} #${entity.id}`;
}
