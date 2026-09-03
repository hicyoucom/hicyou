import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  getAllCategories,
  getAllBookmarks,
  getTagsWithCount,
  getAllCollections,
  getTranslationStats,
  getCategoryTranslationStats,
} from "@/lib/data";
import { CategoryManager } from "@/components/admin/category-manager";
import { BookmarkManager } from "@/components/admin/bookmark-manager";
import { TagManager } from "@/components/admin/tag-manager";
import { CollectionManager } from "@/components/admin/collection-manager";
import { AutoCollectionPanel } from "@/components/admin/auto-collection-panel";
import { TranslationManager } from "@/components/admin/translation-manager";
import {
  getAutoCollectionSourceLimit,
  getLatestAutoCollectionRun,
} from "@/lib/auto-collections";
import { Section, Container } from "@/components/craft";
import {
  Bookmark,
  FolderKanban,
  Settings2,
  Send,
  Tag,
  Library,
  Languages,
  KeyRound,
  BarChart3,
  ChartNoAxesCombined,
  Webhook,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    redirect("/");
  }

  const [
    categories,
    bookmarks,
    tagsWithCount,
    allCollections,
    translationStats,
    categoryTranslationStats,
    latestAutoCollectionRun,
  ] = await Promise.all([
    getAllCategories(true),
    getAllBookmarks(),
    getTagsWithCount(),
    getAllCollections(true),
    getTranslationStats(),
    getCategoryTranslationStats(),
    getLatestAutoCollectionRun(),
  ]);

  return (
    <Section>
      <Container>
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-8">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold tracking-tight">
                Admin Dashboard
              </h1>
              <p className="text-lg text-muted-foreground">
                Manage your bookmarks and categories
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Card className="flex items-center gap-3 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Bookmark className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium leading-none">
                    {bookmarks.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Bookmarks</p>
                </div>
              </Card>
              <Card className="flex items-center gap-3 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FolderKanban className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium leading-none">
                    {categories.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Categories</p>
                </div>
              </Card>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="bookmarks" className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <TabsList className="grid w-[750px] max-w-full shrink-0 grid-cols-5">
                <TabsTrigger value="bookmarks" className="gap-2">
                  <Bookmark className="h-4 w-4" />
                  Bookmarks
                </TabsTrigger>
                <TabsTrigger value="categories" className="gap-2">
                  <FolderKanban className="h-4 w-4" />
                  Categories
                </TabsTrigger>
                <TabsTrigger value="tags" className="gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </TabsTrigger>
                <TabsTrigger value="collections" className="gap-2">
                  <Library className="h-4 w-4" />
                  Collections
                </TabsTrigger>
                <TabsTrigger value="translations" className="gap-2">
                  <Languages className="h-4 w-4" />
                  Translations
                </TabsTrigger>
              </TabsList>
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/hi-studio/category-enrichment">
                  <Button variant="outline" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Category Enrichment
                  </Button>
                </Link>
                <Link href="/hi-studio/submissions">
                  <Button variant="outline" className="gap-2">
                    <Send className="h-4 w-4" />
                    Submissions
                  </Button>
                </Link>
                <Link href="/hi-studio/api-tokens">
                  <Button variant="outline" className="gap-2">
                    <KeyRound className="h-4 w-4" />
                    API Tokens
                  </Button>
                </Link>
                <Link href="/hi-studio/api-usage">
                  <Button variant="outline" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    API Usage
                  </Button>
                </Link>
                <Link href="/hi-studio/analytics">
                  <Button variant="outline" className="gap-2">
                    <ChartNoAxesCombined className="h-4 w-4" />
                    Submission Funnel
                  </Button>
                </Link>
                <Link href="/hi-studio/quality">
                  <Button variant="outline" className="gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Data Quality
                  </Button>
                </Link>
                <Link href="/hi-studio/webhooks">
                  <Button variant="outline" className="gap-2">
                    <Webhook className="h-4 w-4" />
                    Webhooks
                  </Button>
                </Link>
                <Card className="flex items-center gap-2 p-2">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Admin Controls
                  </span>
                </Card>
                <form action="/auth/signout" method="post">
                  <Button
                    type="submit"
                    variant="outline"
                    className="rounded-xl text-muted-foreground"
                  >
                    Sign Out
                  </Button>
                </form>
              </div>
            </div>

            <TabsContent value="bookmarks" className="space-y-4">
              <div className="rounded-xl border bg-card">
                <div className="border-b bg-muted/50 p-4">
                  <h2 className="text-lg font-semibold">Bookmark Management</h2>
                  <p className="text-sm text-muted-foreground">
                    Add, edit, and manage your bookmarks collection
                  </p>
                </div>
                <div className="p-6">
                  <BookmarkManager
                    bookmarks={bookmarks}
                    categories={categories}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              <div className="rounded-xl border bg-card">
                <div className="border-b bg-muted/50 p-4">
                  <h2 className="text-lg font-semibold">Category Management</h2>
                  <p className="text-sm text-muted-foreground">
                    Organize and structure your bookmark categories
                  </p>
                </div>
                <div className="p-6">
                  <CategoryManager categories={categories} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tags" className="space-y-4">
              <div className="rounded-xl border bg-card">
                <div className="border-b bg-muted/50 p-4">
                  <h2 className="text-lg font-semibold">Tag Management</h2>
                  <p className="text-sm text-muted-foreground">
                    Create, edit, merge, and manage tags for bookmarks
                  </p>
                </div>
                <div className="p-6">
                  <TagManager tags={tagsWithCount} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="collections" className="space-y-4">
              <div className="rounded-xl border bg-card">
                <div className="border-b bg-muted/50 p-4">
                  <h2 className="text-lg font-semibold">
                    Collection Management
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Create and manage curated tool collections
                  </p>
                </div>
                <div className="p-6">
                  <AutoCollectionPanel
                    latestRun={latestAutoCollectionRun}
                    sourceLimit={getAutoCollectionSourceLimit()}
                  />
                  <div className="mt-6">
                    <CollectionManager
                      collections={allCollections}
                      bookmarks={bookmarks}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="translations" className="space-y-4">
              <div className="rounded-xl border bg-card">
                <div className="border-b bg-muted/50 p-4">
                  <h2 className="text-lg font-semibold">
                    Translation Management
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Manage multilingual translations for bookmarks
                  </p>
                </div>
                <div className="p-6">
                  <TranslationManager
                    bookmarkStats={translationStats}
                    categoryStats={categoryTranslationStats}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Container>
    </Section>
  );
}
