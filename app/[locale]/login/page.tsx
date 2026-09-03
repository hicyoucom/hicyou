'use client'

import { authClient } from '@/lib/auth-client'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Github } from 'lucide-react'
import { Turnstile } from '@/components/turnstile'

const TURNSTILE_SITE_KEY =
    process.env.NODE_ENV === 'development'
        ? '1x00000000000000000000AA'
        : process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

const ALLOWED_CALLBACK_PATHS = new Set([
    '/account',
    '/account/publisher',
    '/submit',
    '/submit/status',
])

function getLocalizedCallbackURL(locale: string): string {
    const requestedPath = new URLSearchParams(window.location.search).get('next')
    const destination =
        requestedPath && ALLOWED_CALLBACK_PATHS.has(requestedPath)
            ? requestedPath
            : '/account'

    return locale === 'en' ? destination : `/${locale}${destination}`
}

export default function LoginPage() {
    const t = useTranslations('auth')
    const locale = useLocale()
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [turnstileToken, setTurnstileToken] = useState('')
    const [turnstileNonce, setTurnstileNonce] = useState(0)

    const clearTurnstile = () => {
        setTurnstileToken('')
    }

    const resetTurnstileWidget = () => {
        setTurnstileToken('')
        setTurnstileNonce((nonce) => nonce + 1)
    }

    const captchaFetchOptions = turnstileToken
        ? { headers: { 'x-captcha-response': turnstileToken } }
        : undefined

    const handleLogin = async (provider: 'github' | 'google') => {
        if (TURNSTILE_SITE_KEY && !turnstileToken) {
            setMessage(t('securityCheck'))
            return
        }
        setLoading(true)
        const callbackURL = getLocalizedCallbackURL(locale)
        const { error } = await authClient.signIn.social(
            {
                provider,
                callbackURL,
            },
            captchaFetchOptions,
        )
        if (error) {
            setMessage(error.message || t('loginFailed'))
            resetTurnstileWidget()
            setLoading(false)
        }
    }

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (TURNSTILE_SITE_KEY && !turnstileToken) {
            setMessage(t('securityCheck'))
            return
        }
        setLoading(true)
        const callbackURL = getLocalizedCallbackURL(locale)
        const { error } = await authClient.signIn.magicLink(
            {
                email,
                callbackURL,
            },
            captchaFetchOptions,
        )
        if (error) {
            setMessage(error.message || t('magicLinkFailed'))
            resetTurnstileWidget()
        } else {
            setMessage(t('checkEmail'))
            resetTurnstileWidget()
        }
        setLoading(false)
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
            <div className="flex w-full max-w-md flex-col items-center space-y-6">
                <div className="w-full space-y-8">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">
                        {t('signIn')}
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
                                {t('continueWith')}
                            </span>
                        </div>
                    </div>

                    <form className="space-y-6" onSubmit={handleEmailLogin}>
                        <div>
                            <Label htmlFor="email">{t('emailAddress')}</Label>
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

                        {TURNSTILE_SITE_KEY && (
                            <div className="flex justify-center">
                                <Turnstile
                                    key={turnstileNonce}
                                    siteKey={TURNSTILE_SITE_KEY}
                                    onVerify={(token) => setTurnstileToken(token)}
                                    onError={clearTurnstile}
                                />
                            </div>
                        )}

                        <div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? t('sending') : t('signInWithEmail')}
                            </Button>
                        </div>
                        {message && (
                            <p className="text-center text-sm text-red-500">{message}</p>
                        )}
                    </form>
                </div>
            </div>
            </div>
        </div>
    )
}
