"use client";

import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBusiness } from "@/hooks/use-business";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import { BookOpen, Upload, FileText, Trash2, File } from "lucide-react";
import type { KnowledgeBaseFile } from "@/types/database";

function formatFileSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type: string | null) {
  if (type?.includes("pdf")) return "PDF";
  if (type?.includes("word") || type?.includes("doc")) return "DOC";
  if (type?.includes("text")) return "TXT";
  return "FILE";
}

export default function KnowledgeBasePage() {
  const { business } = useBusiness();
  const [files, setFiles] = useState<KnowledgeBaseFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!business?.id) return;
    loadFiles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  async function loadFiles() {
    if (!business?.id) return;
    setLoading(true);
    const { data } = await createClient()
      .from("knowledge_base")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false });
    setFiles((data as KnowledgeBaseFile[]) || []);
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !business?.id) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File too large. Maximum size is 10 MB.");
      return;
    }

    const allowed = ["application/pdf", "text/plain", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type)) {
      toast.error("Only PDF, TXT, DOC, and DOCX files are allowed.");
      return;
    }

    if (files.length >= 10) {
      toast.error("Maximum 10 files allowed. Delete one to upload a new file.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("businessId", business.id);

      const res = await fetch("/api/knowledge-base", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      toast.success("File uploaded to knowledge base!");
      await loadFiles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(file: KnowledgeBaseFile) {
    setDeleting(file.id);
    try {
      const res = await fetch(`/api/knowledge-base?id=${file.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("File deleted");
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch {
      toast.error("Failed to delete file");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Knowledge Base"
        description="Upload your business documents — every AI agent learns from these files"
      />

      <div className="max-w-3xl space-y-6">
        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Business Documents
            </CardTitle>
            <CardDescription>
              Upload PDFs, Word documents, or text files containing your business details,
              SOPs, product catalog, pricing, FAQs, etc. CEO and all agents read these before every task.
              Max 10 files, 10 MB each.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.doc,.docx"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !business}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : "Upload Document"}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Supported: PDF, TXT, DOC, DOCX — Max 10 MB per file
            </p>
          </CardContent>
        </Card>

        {/* Files List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Uploaded Files
              </span>
              <Badge variant="outline">{files.length} / 10</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Loading files...</p>
            ) : files.length === 0 ? (
              <div className="py-10 text-center">
                <File className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload your business documents to give agents full context about your business.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between rounded-lg border p-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                        {fileIcon(file.file_type)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.file_size)} · {formatRelativeTime(file.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        View
                      </a>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(file)}
                        disabled={deleting === file.id}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="rounded-lg border border-blue-400/30 bg-blue-50 dark:bg-blue-950/20 p-4">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">How agents use these files</p>
          <p className="text-xs text-blue-600 dark:text-blue-300">
            Every time the CEO Agent analyzes your business, it reads all uploaded documents first.
            This gives it full context — your SOPs, product catalog, pricing, brand voice — so its
            tasks and suggestions are specific to YOUR business, not generic advice.
          </p>
        </div>
      </div>
    </>
  );
}
