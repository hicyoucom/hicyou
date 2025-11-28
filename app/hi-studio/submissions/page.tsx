"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, ExternalLink, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { SubmissionDetailDialog } from "@/components/admin/submission-detail-dialog";

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

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const params = activeTab !== "all" ? `?status=${activeTab}` : "";
      const response = await fetch(`/api/submissions${params}`);
      const data = await response.json();
      if (data.success) {
        setSubmissions(data.submissions);
      }
    } catch (error) {
      toast.error("Failed to fetch submissions");
    } finally {
      setLoading(false);
    }
  };

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) {
      toast.error("Please select submissions to approve");
      return;
    }

    try {
      const response = await fetch("/api/admin/submissions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, action: "approve" }),
      });

      if (response.ok) {
        toast.success(`Approved ${selectedIds.length} submissions`);
        setSelectedIds([]);
        fetchSubmissions();
      } else {
        toast.error("Batch approve failed");
      }
    } catch (error) {
      toast.error("Batch approve failed");
    }
  };

  const handleBatchReject = async () => {
    if (selectedIds.length === 0) {
      toast.error("Please select submissions to reject");
      return;
    }

    try {
      const response = await fetch("/api/admin/submissions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, action: "reject" }),
      });

      if (response.ok) {
        toast.success(`Rejected ${selectedIds.length} submissions`);
        setSelectedIds([]);
        fetchSubmissions();
      } else {
        toast.error("Batch reject failed");
      }
    } catch (error) {
      toast.error("Batch reject failed");
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [activeTab]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; icon: any }> = {
      pending: { variant: "secondary", label: "Pending", icon: Clock },
      published: { variant: "default", label: "Published", icon: CheckCircle },
      rejected: { variant: "destructive", label: "Rejected", icon: XCircle },
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant as any}>
        <Icon className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("en-US");
  };

  // Pagination
  const totalPages = Math.ceil(submissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSubmissions = submissions.slice(startIndex, endIndex);

  const stats = {
    total: submissions.length,
    pending: submissions.filter((s) => s.status === "pending").length,
    published: submissions.filter((s) => s.status === "published").length,
    rejected: submissions.filter((s) => s.status === "rejected").length,
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === currentSubmissions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentSubmissions.map(s => s.id));
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/hi-studio">
            <Button variant="ghost" className="gap-2 mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Submission Management</h1>
          <p className="text-muted-foreground mt-1">
            Review and manage user submissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchSubmissions} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Published
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.published}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Submission List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Submission List</CardTitle>
              <CardDescription>All user-submitted websites</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Items per page:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(v) => {
                setItemsPerPage(parseInt(v));
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="80">80</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="published">Published</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {selectedIds.length > 0 && (
                <div className="mb-4 flex items-center gap-2 p-3 bg-muted rounded-md">
                  <span className="text-sm">{selectedIds.length} selected</span>
                  <Button size="sm" onClick={handleBatchApprove}>
                    Approve Selected
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleBatchReject}>
                    Reject Selected
                  </Button>
                </div>
              )}

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading...
                </div>
              ) : currentSubmissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No submissions
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">
                            <Checkbox
                              checked={selectedIds.length === currentSubmissions.length}
                              onCheckedChange={toggleSelectAll}
                            />
                          </TableHead>
                          <TableHead>Website</TableHead>
                          <TableHead>Submitter</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentSubmissions.map((submission) => (
                          <TableRow key={submission.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.includes(submission.id)}
                                onCheckedChange={() => toggleSelection(submission.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {submission.logo && (
                                  <Image
                                    src={submission.logo}
                                    alt={submission.title}
                                    width={40}
                                    height={40}
                                    className="rounded"
                                  />
                                )}
                                <div className="space-y-1">
                                  <Link
                                    href={`/submit/${submission.id}`}
                                    className="font-medium hover:underline"
                                  >
                                    {submission.title}
                                  </Link>
                                  <a
                                    href={submission.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    {submission.url}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                  {submission.tagline && (
                                    <div className="text-sm text-muted-foreground">
                                      {submission.tagline}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {submission.submitterName || "-"}
                              {submission.submitterEmail && (
                                <div className="text-sm text-muted-foreground">
                                  {submission.submitterEmail}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(submission.status)}</TableCell>
                            <TableCell className="text-sm">
                              {formatDate(submission.createdAt)}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  // Fetch full submission details
                                  const response = await fetch(`/api/admin/submissions/${submission.id}`);
                                  if (response.ok) {
                                    const data = await response.json();
                                    setSelectedSubmission(data.submission);
                                    setDialogOpen(true);
                                  }
                                }}
                              >
                                Manage
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {startIndex + 1} to {Math.min(endIndex, submissions.length)} of {submissions.length} submissions
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Submission Detail Dialog */}
      <SubmissionDetailDialog
        submission={selectedSubmission}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUpdate={fetchSubmissions}
      />
    </div>
  );
}
