import { describe, expect, test } from "bun:test";

import {
  CategoryAssignmentError,
  normalizeCategorySelection,
} from "@/lib/category-assignments";

describe("category assignment normalization", () => {
  test("keeps the primary category first and removes duplicates", () => {
    expect(normalizeCategorySelection(3, [7, 3, 9])).toEqual([3, 7, 9]);
  });

  test("supports an empty draft assignment", () => {
    expect(normalizeCategorySelection(null, [])).toEqual([]);
  });

  test("rejects invalid ids and more than three unique categories", () => {
    expect(() => normalizeCategorySelection(0, [])).toThrow(
      CategoryAssignmentError,
    );
    expect(() => normalizeCategorySelection(1, [2, 3, 4])).toThrow(
      "Select at most 3 categories",
    );
  });
});
