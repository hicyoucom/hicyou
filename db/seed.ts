import { db } from "@/db/client";
import { bookmarkCategories, bookmarks, categories } from "@/db/schema";

async function seed() {
  const [category] = await db
    .insert(categories)
    .values({
      name: "Example tools",
      description: "Synthetic entries for a new local installation",
      slug: "example-tools",
      color: "#2563eb",
      icon: "box",
    })
    .onConflictDoNothing({ target: categories.slug })
    .returning();

  const selectedCategory =
    category ??
    (await db.query.categories.findFirst({
      where: (table, { eq }) => eq(table.slug, "example-tools"),
    }));
  if (!selectedCategory)
    throw new Error("Could not create the example category");

  const [bookmark] = await db
    .insert(bookmarks)
    .values({
      url: "https://app.example.com",
      title: "Example application",
      slug: "example-application",
      description: "A synthetic directory entry that is safe to replace.",
      categoryId: selectedCategory.id,
      overview:
        "Replace this record with content that you own or are authorized to publish.",
      status: "published",
      publishedAt: new Date(),
    })
    .onConflictDoNothing({ target: bookmarks.slug })
    .returning();

  if (bookmark) {
    await db
      .insert(bookmarkCategories)
      .values({
        bookmarkId: bookmark.id,
        categoryId: selectedCategory.id,
        position: 0,
        source: "seed",
      })
      .onConflictDoNothing();
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(
      "Seed failed",
      error instanceof Error ? error.message : "unknown error",
    );
    process.exit(1);
  });
