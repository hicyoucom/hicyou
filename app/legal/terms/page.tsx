import { Section, Container } from "@/components/craft";
import { TopNav } from "@/components/top-nav";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Our Directory",
  description: "Terms of Service for our directory platform",
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
              <p className="text-muted-foreground">Last updated: November 16, 2025</p>
            </div>

            <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">1. Agreement to Terms</h2>
                <p>
                  By accessing and using our service ("the Service"), you accept and agree to be bound by the terms
                  and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">2. Use License</h2>
                <p>
                  Permission is granted to temporarily access and use the Service for personal, non-commercial
                  transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Modify or copy the materials</li>
                  <li>Use the materials for any commercial purpose or for any public display</li>
                  <li>Attempt to reverse engineer any software contained on the Service</li>
                  <li>Remove any copyright or other proprietary notations from the materials</li>
                  <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">3. Open Source License</h2>
                <p>
                  This is an open source project. You are free to use, modify, and distribute the source code
                  for personal and commercial purposes under the following conditions:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Attribution Required:</strong> You must display the "Powered by" badge on your website
                    in a visible location, typically in the footer or about page
                  </li>
                  <li>
                    <strong>Badge Link:</strong> The badge must link back to our official website
                  </li>
                  <li>
                    <strong>No Removal:</strong> The attribution badge may not be removed, obscured, or made invisible
                  </li>
                  <li>
                    <strong>Modification Allowed:</strong> You may modify the source code to fit your needs
                  </li>
                </ul>
                <p>
                  Failure to comply with the attribution requirement will result in violation of these terms and
                  may result in legal action.
                </p>
                <p className="text-sm pt-4">
                  <Link href="/legal" className="text-primary hover:underline">
                    View HiCyou Attribution License (HAL) →
                  </Link>
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">4. User Submissions</h2>
                <p>
                  By submitting content to us, you grant us a non-exclusive, worldwide, royalty-free license to use,
                  reproduce, modify, and display the submitted content. You represent that:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>You own or have the necessary rights to the content you submit</li>
                  <li>The content does not violate any third-party rights</li>
                  <li>The content is accurate and not misleading</li>
                  <li>The content does not contain malicious code or links</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">5. Dofollow Links Policy</h2>
                <p>
                  We offer dofollow links to submitted websites that meet our quality standards and display
                  our attribution badge. We reserve the right to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Convert dofollow links to nofollow at our discretion</li>
                  <li>Remove submissions that violate our policies</li>
                  <li>Change link attributes based on badge verification</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">6. Prohibited Content</h2>
                <p>You may not submit or link to content that:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Is illegal, harmful, threatening, abusive, or harassing</li>
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
                  The Service is provided "as is" without any representations or warranties, express or implied.
                  We make no representations or warranties in relation to the Service or the information and
                  materials provided on the Service.
                </p>
                <p>
                  We do not warrant that the Service will be constantly available, uninterrupted, or free from errors
                  or defects. We are not responsible for the content of external websites linked through our Service.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">8. Limitations of Liability</h2>
                <p>
                  In no event shall we or our suppliers be liable for any damages (including, without limitation,
                  damages for loss of data or profit, or due to business interruption) arising out of the use or inability
                  to use the Service.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">9. Privacy</h2>
                <p>
                  Your use of the Service is also governed by our Privacy Policy. Please review our Privacy Policy,
                  which also governs the Service and informs users of our data collection practices.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">10. Modifications to Terms</h2>
                <p>
                  We reserve the right to modify these terms at any time. We will notify users of any material changes
                  by posting the new Terms of Service on this page. Your continued use of the Service after such modifications
                  constitutes your acceptance of the updated terms.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">11. Termination</h2>
                <p>
                  We may terminate or suspend your access to the Service immediately, without prior notice or liability,
                  for any reason whatsoever, including without limitation if you breach the Terms.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">12. Governing Law</h2>
                <p>
                  These Terms shall be governed and construed in accordance with applicable laws, without regard to
                  its conflict of law provisions.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">13. Contact Information</h2>
                <p>
                  If you have any questions about these Terms, please contact us through our website.
                </p>
              </section>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}

