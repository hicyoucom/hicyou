import { Section, Container } from "@/components/craft";
import { TopNav } from "@/components/top-nav";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | HiCyou",
  description: "Terms of Service for HiCyou directory platform",
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <Section>
        <Container>
          <div className="mx-auto max-w-4xl space-y-8 py-12">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold">Terms of Service</h1>
              <p className="text-muted-foreground">
                Last updated: September 2, 2026
              </p>
              <p className="text-sm">
                <Link href="/legal" className="text-primary hover:underline">
                  View open-source license and notices →
                </Link>
              </p>
            </div>

            <div className="prose prose-gray max-w-none space-y-6 dark:prose-invert">
              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">
                  1. Agreement to Terms
                </h2>
                <p>
                  By accessing and using HiCyou ("the Service"), you accept and
                  agree to be bound by the terms and provision of this
                  agreement. If you do not agree to abide by the above, please
                  do not use this service.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">2. Use License</h2>
                <p>
                  Permission is granted to temporarily access and use the
                  Service for personal, non-commercial transitory viewing only.
                  This is the grant of a license, not a transfer of title, and
                  under this license you may not:
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li>Modify or copy the materials</li>
                  <li>
                    Use the materials for any commercial purpose or for any
                    public display
                  </li>
                  <li>
                    Attempt to reverse engineer any software contained on the
                    Service
                  </li>
                  <li>
                    Remove any copyright or other proprietary notations from the
                    materials
                  </li>
                  <li>
                    Transfer the materials to another person or "mirror" the
                    materials on any other server
                  </li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">
                  3. Open Source License
                </h2>
                <p>
                  The publicly released HiCyou source code is licensed under the
                  Apache License 2.0. Your use, modification, and distribution
                  of that code are governed by the license and notices included
                  in the source repository.
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li>
                    <strong>Recommended brand credit:</strong> You are welcome
                    to display the &quot;Powered by HiCyou&quot; badge and link
                    it to the official project website, but doing so is optional
                    and is not a condition of the Apache License 2.0.
                  </li>
                  <li>
                    <strong>Project identity:</strong> The Apache License 2.0
                    does not grant permission to imply endorsement or use
                    project marks in a way that suggests an official HiCyou
                    deployment.
                  </li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">4. User Submissions</h2>
                <p>
                  By submitting content to HiCyou, you grant us a
                  non-exclusive, worldwide, royalty-free license to use,
                  reproduce, modify, and display the submitted content. You
                  represent that:
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li>
                    You own or have the necessary rights to the content you
                    submit
                  </li>
                  <li>The content does not violate any third-party rights</li>
                  <li>The content is accurate and not misleading</li>
                  <li>The content does not contain malicious code or links</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">
                  5. Dofollow Links Policy
                </h2>
                <p>
                  HiCyou may offer dofollow links to submissions that meet our
                  quality standards. Displaying the optional attribution badge
                  may be considered as one trust signal, but it is not a
                  software license requirement. We reserve the right to:
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li>Convert dofollow links to nofollow at our discretion</li>
                  <li>Remove submissions that violate our policies</li>
                  <li>Change link attributes based on badge verification</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">
                  6. Prohibited Content
                </h2>
                <p>You may not submit or link to content that:</p>
                <ul className="list-disc space-y-2 pl-6">
                  <li>
                    Is illegal, harmful, threatening, abusive, or harassing
                  </li>
                  <li>Contains malware, viruses, or other harmful code</li>
                  <li>Promotes violence, discrimination, or hate speech</li>
                  <li>Infringes on intellectual property rights</li>
                  <li>Contains spam, scams, or fraudulent content</li>
                  <li>Violates privacy or data protection laws</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">7. Disclaimer</h2>
                <p>
                  The Service is provided "as is" without any representations or
                  warranties, express or implied. HiCyou makes no
                  representations or warranties in relation to the Service or
                  the information and materials provided on the Service.
                </p>
                <p>
                  We do not warrant that the Service will be constantly
                  available, uninterrupted, or free from errors or defects. We
                  are not responsible for the content of external websites
                  linked through our Service.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">
                  8. Limitations of Liability
                </h2>
                <p>
                  In no event shall HiCyou or its suppliers be liable for any
                  damages (including, without limitation, damages for loss of
                  data or profit, or due to business interruption) arising out
                  of the use or inability to use the Service.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">9. Privacy</h2>
                <p>
                  Your use of the Service is also governed by our Privacy
                  Policy. Please review our Privacy Policy, which also governs
                  the Service and informs users of our data collection
                  practices.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">
                  10. Modifications to Terms
                </h2>
                <p>
                  We reserve the right to modify these terms at any time. We
                  will notify users of any material changes by posting the new
                  Terms of Service on this page. Your continued use of the
                  Service after such modifications constitutes your acceptance
                  of the updated terms.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">11. Termination</h2>
                <p>
                  We may terminate or suspend your access to the Service
                  immediately, without prior notice or liability, for any reason
                  whatsoever, including without limitation if you breach the
                  Terms.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">12. Governing Law</h2>
                <p>
                  These Terms shall be governed and construed in accordance with
                  applicable laws, without regard to its conflict of law
                  provisions.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">
                  13. Contact Information
                </h2>
                <p>
                  If you have any questions about these Terms, please contact us
                  through our website or repository.
                </p>
              </section>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}
