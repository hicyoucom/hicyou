import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { db } from '@/db/client'
import { submissions, categories } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { TopNav } from '@/components/top-nav'
import { CategorySidebar } from '@/components/category-sidebar'
import { Suspense } from 'react'
import { getAllCategories } from '@/lib/data'

export default async function AccountPage() {
    const supabase = createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const userSubmissions = await db
        .select()
        .from(submissions)
        .where(eq(submissions.userId, user.id))
        .orderBy(desc(submissions.createdAt))

    const allCategories = await getAllCategories()

    return (
        <div className="min-h-screen bg-background">
            <TopNav />
            <div className="flex max-w-[1800px] mx-auto">
                {/* Left Sidebar */}
                <Suspense fallback={<div className="hidden lg:block w-56 pr-6 border-r">Loading...</div>}>
                    <CategorySidebar
                        categories={allCategories.map((cat) => ({
                            id: cat.id.toString(),
                            name: cat.name,
                            slug: cat.slug,
                            color: cat.color || undefined,
                            icon: cat.icon || undefined,
                        }))}
                        bookmarksCount={0}
                    />
                </Suspense>

                {/* Main Content */}
                <main className="flex-1 max-w-full overflow-x-hidden w-full lg:w-auto">
                    <div className="px-4 lg:px-8 py-8 max-w-4xl mx-auto">
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-medium">Account</h3>
                                <p className="text-sm text-muted-foreground">
                                    Manage your account settings and preferences.
                                </p>
                            </div>
                            <div className="border-t pt-6">
                                <dl className="divide-y divide-border">
                                    <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
                                        <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                                        <dd className="mt-1 flex text-sm text-foreground sm:col-span-2 sm:mt-0">
                                            <span className="flex-grow">{user.email}</span>
                                        </dd>
                                    </div>
                                    <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
                                        <dt className="text-sm font-medium text-muted-foreground">Name</dt>
                                        <dd className="mt-1 flex text-sm text-foreground sm:col-span-2 sm:mt-0">
                                            <span className="flex-grow">{user.user_metadata?.name || user.user_metadata?.full_name || 'Not set'}</span>
                                        </dd>
                                    </div>
                                </dl>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">My Submissions</h3>
                                {userSubmissions.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No submissions yet.</p>
                                ) : (
                                    <div className="grid gap-4">
                                        {userSubmissions.map((submission) => (
                                            <div key={submission.id} className="flex items-center justify-between rounded-lg border p-4">
                                                <div>
                                                    <h4 className="font-medium">{submission.title}</h4>
                                                    <p className="text-sm text-muted-foreground">{submission.url}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <Badge variant={submission.status === 'published' ? 'default' : 'secondary'}>
                                                        {submission.status}
                                                    </Badge>
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={`/submit/${submission.id}`}>View</Link>
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end pt-6">
                                <form action="/auth/signout" method="post">
                                    <Button variant="destructive" type="submit">Sign out</Button>
                                </form>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
