"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface Submission {
    id: number;
    url: string;
    title: string;
    tagline: string | null;
    description: string | null;
    whyStartups: string | null;
    alternatives: string | null;
    pricingType: string;
    logo: string | null;
    cover: string | null;
    categoryId: number | null;
    submitterEmail: string | null;
    submitterName: string | null;
    status: string;
    isDofollow: boolean;
    hasBadge: boolean;
    badgeVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    keyFeatures: any;
    useCases: any;
    faqs: any;
}

interface SubmissionDetailDialogProps {
    submission: Submission | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: () => void;
}

export function SubmissionDetailDialog({
    submission,
    open,
    onOpenChange,
    onUpdate,
}: SubmissionDetailDialogProps) {
    const [isDofollow, setIsDofollow] = useState(submission?.isDofollow || false);
    const [loading, setLoading] = useState(false);

    if (!submission) return null;

    const handleApprove = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/submissions/${submission.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: "published",
                    isDofollow,
                }),
            });

            if (response.ok) {
                toast.success("Submission approved");
                onUpdate();
                onOpenChange(false);
            } else {
                toast.error("Failed to approve submission");
            }
        } catch (error) {
            toast.error("Failed to approve submission");
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/submissions/${submission.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: "rejected",
                }),
            });

            if (response.ok) {
                toast.success("Submission rejected");
                onUpdate();
                onOpenChange(false);
            } else {
                toast.error("Failed to reject submission");
            }
        } catch (error) {
            toast.error("Failed to reject submission");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {submission.logo && (
                            <Image
                                src={submission.logo}
                                alt={submission.title}
                                width={32}
                                height={32}
                                className="rounded"
                            />
                        )}
                        {submission.title}
                    </DialogTitle>
                    <DialogDescription>
                        <a
                            href={submission.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                            {submission.url}
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Cover Image */}
                    {submission.cover && (
                        <div className="rounded-lg overflow-hidden border">
                            <Image
                                src={submission.cover}
                                alt={submission.title}
                                width={800}
                                height={400}
                                className="w-full h-auto"
                            />
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-muted-foreground">Status</Label>
                            <div className="mt-1">
                                <Badge variant={submission.status === "published" ? "default" : "secondary"}>
                                    {submission.status}
                                </Badge>
                            </div>
                        </div>
                        <div>
                            <Label className="text-muted-foreground">Pricing</Label>
                            <div className="mt-1 font-medium">{submission.pricingType}</div>
                        </div>
                    </div>

                    {/* Tagline */}
                    {submission.tagline && (
                        <div>
                            <Label className="text-muted-foreground">Tagline</Label>
                            <p className="mt-1">{submission.tagline}</p>
                        </div>
                    )}

                    {/* Description */}
                    {submission.description && (
                        <div>
                            <Label className="text-muted-foreground">Description</Label>
                            <p className="mt-1 text-sm">{submission.description}</p>
                        </div>
                    )}

                    {/* Why Startups */}
                    {submission.whyStartups && (
                        <div>
                            <Label className="text-muted-foreground">Why Startups Need This</Label>
                            <p className="mt-1 text-sm">{submission.whyStartups}</p>
                        </div>
                    )}

                    {/* Alternatives */}
                    {submission.alternatives && (
                        <div>
                            <Label className="text-muted-foreground">Alternatives</Label>
                            <p className="mt-1 text-sm">{submission.alternatives}</p>
                        </div>
                    )}

                    {/* Key Features */}
                    {submission.keyFeatures && Array.isArray(submission.keyFeatures) && submission.keyFeatures.length > 0 && (
                        <div>
                            <Label className="text-muted-foreground">Key Features</Label>
                            <ul className="mt-1 list-disc list-inside text-sm">
                                {(submission.keyFeatures as string[]).map((feature, i) => (
                                    <li key={i}>{feature}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Use Cases */}
                    {submission.useCases && Array.isArray(submission.useCases) && submission.useCases.length > 0 && (
                        <div>
                            <Label className="text-muted-foreground">Use Cases</Label>
                            <ul className="mt-1 list-disc list-inside text-sm">
                                {(submission.useCases as string[]).map((useCase, i) => (
                                    <li key={i}>{useCase}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* FAQs */}
                    {submission.faqs && Array.isArray(submission.faqs) && submission.faqs.length > 0 && (
                        <div>
                            <Label className="text-muted-foreground">FAQs</Label>
                            <div className="mt-1 space-y-2">
                                {(submission.faqs as { question: string; answer: string }[]).map((faq, i) => (
                                    <div key={i} className="text-sm">
                                        <p className="font-medium">Q: {faq.question}</p>
                                        <p className="text-muted-foreground">A: {faq.answer}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Badge Status */}
                    <div className="border-t pt-4">
                        <Label className="text-muted-foreground">Badge Verification</Label>
                        <div className="mt-2 flex items-center gap-2">
                            {submission.badgeVerified ? (
                                <Badge variant="default" className="bg-green-600">
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                    Badge Verified
                                </Badge>
                            ) : submission.hasBadge ? (
                                <Badge variant="secondary">
                                    Badge Added (Not Verified)
                                </Badge>
                            ) : (
                                <Badge variant="outline">
                                    No Badge
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Submitter Info */}
                    <div className="border-t pt-4">
                        <Label className="text-muted-foreground">Submitter</Label>
                        <div className="mt-2 space-y-1">
                            <p className="font-medium">{submission.submitterName || "Anonymous"}</p>
                            {submission.submitterEmail && (
                                <p className="text-sm text-muted-foreground">{submission.submitterEmail}</p>
                            )}
                        </div>
                    </div>

                    {/* Dofollow Toggle */}
                    <div className="border-t pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="dofollow">Dofollow Link</Label>
                                <p className="text-sm text-muted-foreground">
                                    Enable dofollow attribute for this submission
                                </p>
                            </div>
                            <Switch
                                id="dofollow"
                                checked={isDofollow}
                                onCheckedChange={setIsDofollow}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    {submission.status === "pending" && (
                        <>
                            <Button
                                variant="destructive"
                                onClick={handleReject}
                                disabled={loading}
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                            </Button>
                            <Button onClick={handleApprove} disabled={loading}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
