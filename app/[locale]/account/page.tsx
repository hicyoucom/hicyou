import { getSession } from '@/lib/get-session'
import { Button } from '@/components/ui/button'
import { Link, redirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/config'
import { TopNav } from '@/components/top-nav'
import { CategorySidebar } from '@/components/category-sidebar'
import { Suspense } from 'react'
import { getAllCategoriesTranslated } from '@/lib/data'
import { getTranslations } from 'next-intl/server'

export default async function AccountPage({
    params,
}: {
    params: Promise<{ locale: Locale }>;
}) {
    const { locale } = await params;
    const session = await getSession()
    const user = session?.user

    if (!user) {
        return redirect({ href: '/login?next=/account', locale })
    }

    const [t, tc, ts, allCategories] = await Promise.all([
        getTranslations('account'),
        getTranslations('common'),
        getTranslations('submissionStatus'),
        getAllCategoriesTranslated(locale),
    ]);

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
                            groupKey: cat.groupKey,
                        }))}
                    />
                </Suspense>

                {/* Main Content */}
                <main className="flex-1 max-w-full overflow-x-hidden w-full lg:w-auto">
                    <div className="px-4 lg:px-8 py-8 max-w-4xl mx-auto">
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-medium">{t('title')}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {t('description')}
                                </p>
                            </div>
                            <div className="border-t pt-6">
                                <dl className="divide-y divide-border">
                                    <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
                                        <dt className="text-sm font-medium text-muted-foreground">{t('email')}</dt>
                                        <dd className="mt-1 flex text-sm text-foreground sm:col-span-2 sm:mt-0">
                                            <span className="flex-grow">{user.email}</span>
                                        </dd>
                                    </div>
                                    <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
                                        <dt className="text-sm font-medium text-muted-foreground">{t('name')}</dt>
                                        <dd className="mt-1 flex text-sm text-foreground sm:col-span-2 sm:mt-0">
                                            <span className="flex-grow">{user.name || t('notSet')}</span>
                                        </dd>
                                    </div>
                                </dl>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">{tc('mySubmissions')}</h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="rounded-xl border bg-card p-5">
                                        <p className="font-medium">{ts('title')}</p>
                                        <p className="mt-1 text-sm text-muted-foreground">{ts('description')}</p>
                                        <Button className="mt-4" asChild>
                                            <Link href="/submit/status">{ts('title')}</Link>
                                        </Button>
                                    </div>
                                    <div className="rounded-xl border bg-card p-5">
                                        <p className="font-medium">{t('publisherDashboard')}</p>
                                        <p className="mt-1 text-sm text-muted-foreground">{t('publisherDashboardDescription')}</p>
                                        <Button className="mt-4" asChild variant="outline">
                                            <Link href="/account/publisher">{t('openPublisherDashboard')}</Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-6">
                                <form action="/api/auth/sign-out" method="post">
                                    <Button variant="destructive" type="submit">{t('signOut')}</Button>
                                </form>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
