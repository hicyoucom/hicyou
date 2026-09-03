
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

interface SubmissionBadgeVerifierProps {
    submissionId: number;
    initialVerified: boolean;
}

export function SubmissionBadgeVerifier({
    submissionId,
    initialVerified,
}: SubmissionBadgeVerifierProps) {
    const [isVerified, setIsVerified] = useState(initialVerified);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleVerify = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/submissions/${submissionId}/verify-badge`, {
                method: "POST",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Verification failed");
            }

            if (data.verified) {
                setIsVerified(true);
            } else {
                setError(data.message || "Badge not found on your website.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    if (isVerified) {
        return (
            <Alert variant="default" className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                <AlertTitle className="text-green-800 dark:text-green-500">Badge Verified! 🎉</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-400">
                    Your badge is verified. A <strong>Dofollow</strong> link will be used if this submission is published.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-500" />
            <AlertTitle className="text-blue-800 dark:text-blue-500">Get Dofollow Link</AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-400 space-y-3">
                <p>
                    Add our badge to your website and verify it to be eligible for a <strong>Dofollow</strong> link if this submission is published.
                    Without verification, you'll get a <strong>nofollow</strong> link.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                        onClick={handleVerify}
                        disabled={isLoading}
                        size="sm"
                        className="w-full sm:w-auto"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Verifying...
                            </>
                        ) : (
                            "Verify Badge Now"
                        )}
                    </Button>

                    <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                        <Link href="/submit#badge-info">View Badge Instructions</Link>
                    </Button>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mt-2 bg-red-50 dark:bg-red-950/30 p-2 rounded">
                        <XCircle className="h-4 w-4" />
                        <span>{error}</span>
                    </div>
                )}
            </AlertDescription>
        </Alert>
    );
}
