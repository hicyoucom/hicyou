import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/account'

    if (code) {
        const supabase = createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            // Get user data after successful login
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                // Create or update profile record
                try {
                    const existingProfile = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1)

                    if (existingProfile.length === 0) {
                        // Extract name from OAuth metadata
                        const name = user.user_metadata?.full_name ||
                                   user.user_metadata?.name ||
                                   null;

                        // Create new profile
                        await db.insert(profiles).values({
                            id: user.id,
                            email: user.email,
                            name: name,
                            fullName: user.user_metadata?.full_name || user.user_metadata?.name || null,
                            avatarUrl: user.user_metadata?.avatar_url || null,
                        })
                    } else {
                        // Update existing profile
                        const updateData: any = {
                            email: user.email,
                            fullName: user.user_metadata?.full_name || user.user_metadata?.name || null,
                            avatarUrl: user.user_metadata?.avatar_url || null,
                            updatedAt: new Date(),
                        };

                        // Update name if not set
                        if (!existingProfile[0].name) {
                            const name = user.user_metadata?.full_name ||
                                       user.user_metadata?.name ||
                                       null;
                            if (name) {
                                updateData.name = name;
                            }
                        }

                        await db.update(profiles)
                            .set(updateData)
                            .where(eq(profiles.id, user.id))
                    }
                } catch (dbError) {
                    console.error('Error creating/updating profile:', dbError)
                    // Continue anyway - user can still login
                }
            }

            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}
