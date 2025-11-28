"use client";

import { useState } from "react";
import AdminHeader from "@/components/admin/admin-header";

export default function AdminPage() {
  const [formData, setFormData] = useState({
    url: "",
    slug: "",
    name: "",
    description: "",
    category: "",
    use_case: "",
    how_to_use: "",
    overview: "",
    screenshot_url: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        ...formData,
        keyFeatures: (() => {
          if (!(formData as any).keyFeatures) return [];
          try {
            const parsed = JSON.parse((formData as any).keyFeatures);
            return Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            return (formData as any).keyFeatures.split('\n').filter((line: string) => line.trim());
          }
        })(),
        useCases: (() => {
          if (!(formData as any).useCases) return [];
          try {
            const parsed = JSON.parse((formData as any).useCases);
            return Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            return (formData as any).useCases.split('\n').filter((line: string) => line.trim());
          }
        })(),
        faqs: (() => {
          if (!(formData as any).faqs) return [];
          try {
            const parsed = JSON.parse((formData as any).faqs);
            return Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            return parseFaqs((formData as any).faqs);
          }
        })(),
      };

      const response = await fetch("/api/bookmarks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to add bookmark");
      }

      // Clear form after successful submission
      setFormData({
        url: "",
        slug: "",
        name: "",
        description: "",
        category: "",
        use_case: "",
        how_to_use: "",
        overview: "",
        screenshot_url: "",
        // @ts-ignore
        keyFeatures: "",
        useCases: "",
        faqs: "",
      });

      alert("Bookmark added successfully!");
    } catch (error) {
      console.error("Error adding bookmark:", error);
      alert("Failed to add bookmark. Please try again.");
    }
  };

  function parseFaqs(text: string) {
    const faqs: { question: string; answer: string }[] = [];
    const lines = text.split('\n');
    let currentQ = "";
    let currentA = "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("Q:") || trimmed.startsWith("q:")) {
        if (currentQ && currentA) {
          faqs.push({ question: currentQ, answer: currentA.trim() });
          currentA = "";
        }
        currentQ = trimmed.substring(2).trim();
      } else if (trimmed.startsWith("A:") || trimmed.startsWith("a:")) {
        currentA += trimmed.substring(2).trim() + " ";
      } else if (currentA) {
        currentA += trimmed + " ";
      }
    }
    if (currentQ && currentA) {
      faqs.push({ question: currentQ, answer: currentA.trim() });
    }
    return faqs;
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <>
      <AdminHeader />
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="mb-6 text-3xl font-bold">Add New Bookmark</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="url" className="mb-1 block text-sm font-medium">
              URL *
            </label>
            <input
              type="url"
              id="url"
              name="url"
              required
              value={formData.url}
              onChange={handleChange}
              className="w-full rounded-md border p-2"
            />
          </div>

          <div>
            <label htmlFor="slug" className="mb-1 block text-sm font-medium">
              Slug *
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              required
              value={formData.slug}
              onChange={handleChange}
              className="w-full rounded-md border p-2"
            />
          </div>

          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full rounded-md border p-2"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-1 block text-sm font-medium"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full rounded-md border p-2"
              rows={3}
            />
          </div>

          <div>
            <label
              htmlFor="category"
              className="mb-1 block text-sm font-medium"
            >
              Category
            </label>
            <input
              type="text"
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full rounded-md border p-2"
            />
          </div>

          <div>
            <label
              htmlFor="use_case"
              className="mb-1 block text-sm font-medium"
            >
              Use Case
            </label>
            <textarea
              id="use_case"
              name="use_case"
              value={formData.use_case}
              onChange={handleChange}
              className="w-full rounded-md border p-2"
              rows={3}
            />
          </div>

          <div>
            <label
              htmlFor="how_to_use"
              className="mb-1 block text-sm font-medium"
            >
              How to Use
            </label>
            <textarea
              id="how_to_use"
              name="how_to_use"
              value={formData.how_to_use}
              onChange={handleChange}
              className="w-full rounded-md border p-2"
              rows={3}
            />
          </div>

          <div>
            <label
              htmlFor="overview"
              className="mb-1 block text-sm font-medium"
            >
              Overview
            </label>
            <textarea
              id="overview"
              name="overview"
              value={formData.overview}
              onChange={handleChange}
              className="w-full rounded-md border p-2"
              rows={3}
            />
          </div>

          <div>
            <label
              htmlFor="screenshot_url"
              className="mb-1 block text-sm font-medium"
            >
              Screenshot URL
            </label>
            <input
              type="url"
              id="screenshot_url"
              name="screenshot_url"
              value={formData.screenshot_url}
              onChange={handleChange}
              className="w-full rounded-md border p-2"
            />
          </div>

          <div>
            <label htmlFor="keyFeatures" className="mb-1 block text-sm font-medium">
              Key Features (JSON or One per line)
            </label>
            <textarea
              id="keyFeatures"
              name="keyFeatures"
              value={(formData as any).keyFeatures || ""}
              onChange={handleChange}
              className="w-full rounded-md border p-2"
              placeholder='["Feature 1", "Feature 2"]'
            />
          </div>

          <div>
            <label htmlFor="useCases" className="mb-1 block text-sm font-medium">
              Use Cases (JSON or One per line)
            </label>
            <textarea
              id="useCases"
              name="useCases"
              value={(formData as any).useCases || ""}
              onChange={handleChange}
              className="w-full rounded-md border p-2"
              placeholder='["Use Case 1", "Use Case 2"]'
            />
          </div>

          <div>
            <label htmlFor="faqs" className="mb-1 block text-sm font-medium">
              FAQs (JSON or Q: ... A: ...)
            </label>
            <textarea
              id="faqs"
              name="faqs"
              value={(formData as any).faqs || ""}
              onChange={handleChange}
              className="w-full rounded-md border p-2"
              placeholder='[{"question": "Q1", "answer": "A1"}]'
            />
          </div>

          <button
            type="submit"
            className="rounded-md bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
          >
            Add Bookmark
          </button>
        </form>
      </div>
    </>
  );
}

