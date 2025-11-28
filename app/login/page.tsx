'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Github } from 'lucide-react'
import { Turnstile } from '@/components/turnstile'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [turnstileToken, setTurnstileToken] = useState('')
    const supabase = createClient()

    const handleLogin = async (provider: 'google' | 'github') => {
        if (!turnstileToken) {
            setMessage('Please complete the security check')
            return
        }
        setLoading(true)
        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${location.origin}/auth/callback`,
                queryParams: {
                    'captcha_token': turnstileToken // Pass token if you have a custom auth flow verifying it, or just rely on client-side check for now + rate limits
                }
            },
        })
        if (error) {
            setMessage(error.message)
            setLoading(false)
        }
    }

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!turnstileToken) {
            setMessage('Please complete the security check')
            return
        }
        setLoading(true)
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${location.origin}/auth/callback`,
                captchaToken: turnstileToken, // Supabase supports captchaToken for email auth
            },
        })
        if (error) {
            setMessage(error.message)
        } else {
            setMessage('Check your email for the login link!')
        }
        setLoading(false)
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
                        Sign in to your account
                    </h2>

                </div>

                <div className="mt-8 space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="outline"
                            onClick={() => handleLogin('github')}
                            disabled={loading}
                        >
                            <Github className="mr-2 h-4 w-4" />
                            Github
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleLogin('google')}
                            disabled={loading}
                        >
                            <span className="mr-2">G</span>
                            Google
                        </Button>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    <form className="space-y-6" onSubmit={handleEmailLogin}>
                        <div>
                            <Label htmlFor="email">Email address</Label>
                            <div className="mt-2">
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <Turnstile
                                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                                onVerify={(token) => setTurnstileToken(token)}
                            />
                        </div>

                        <div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Sending magic link...' : 'Sign in with Email'}
                            </Button>
                        </div>
                        {message && (
                            <p className="text-center text-sm text-red-500">{message}</p>
                        )}
                    </form>
                </div>
            </div>
        </div>
    )
}
