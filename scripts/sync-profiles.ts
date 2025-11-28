import { createClient } from '@supabase/supabase-js'
import { db } from '../db/client'
import { profiles } from '../db/schema'
import { eq } from 'drizzle-orm'
import 'dotenv/config'

async function syncProfiles() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Missing Supabase environment variables')
    }

    // Create Supabase admin client
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    console.log('Fetching all users from Supabase Auth...')

    // Get all users from Supabase Auth
    const { data: { users }, error } = await supabase.auth.admin.listUsers()

    if (error) {
        console.error('Error fetching users:', error)
        return
    }

    console.log(`Found ${users.length} users in Supabase Auth`)

    for (const user of users) {
        try {
            // Check if profile exists
            const existingProfile = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1)

            if (existingProfile.length === 0) {
                // Create profile
                await db.insert(profiles).values({
                    id: user.id,
                    email: user.email,
                    fullName: user.user_metadata?.full_name || user.user_metadata?.name || null,
                    avatarUrl: user.user_metadata?.avatar_url || null,
                })
                console.log(`✓ Created profile for user: ${user.email}`)
            } else {
                console.log(`- Profile already exists for: ${user.email}`)
            }
        } catch (err) {
            console.error(`✗ Error processing user ${user.email}:`, err)
        }
    }

    console.log('Profile sync complete!')
    process.exit(0)
}

syncProfiles().catch(console.error)
