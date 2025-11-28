import { Section, Container } from "@/components/craft";
import { TopNav } from "@/components/top-nav";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Our Directory",
  description: "Privacy Policy for our directory platform",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <Section>
        <Container>
          <div className="mx-auto max-w-4xl space-y-8 py-12">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold">Privacy Policy</h1>
              <p className="text-muted-foreground">Last updated: November 16, 2025</p>
            </div>

            <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">1. Introduction</h2>
                <p>
                  We ("we", "our", or "us") are committed to protecting your privacy. This Privacy Policy explains
                  how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
                </p>
                <p>
                  Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy,
                  please do not access the site.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">2. Information We Collect</h2>

                <h3 className="text-xl font-semibold">2.1 Information You Provide</h3>
                <p>We may collect information that you voluntarily provide to us when you:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Submit a website or resource to our directory</li>
                  <li>Contact us with inquiries</li>
                  <li>Subscribe to our newsletter (if applicable)</li>
                  <li>Participate in user surveys or feedback</li>
                </ul>
                <p>This information may include:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Name and email address</li>
                  <li>Website URL and description</li>
                  <li>Any other information you choose to provide</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4">2.2 Automatically Collected Information</h3>
                <p>When you visit our website, we may automatically collect certain information about your device, including:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>IP address</li>
                  <li>Browser type and version</li>
                  <li>Operating system</li>
                  <li>Referring website</li>
                  <li>Pages viewed and links clicked</li>
                  <li>Date and time of visit</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4">2.3 Cookies and Tracking Technologies</h3>
                <p>
                  We may use cookies and similar tracking technologies to track activity on our service and hold certain information.
                  You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">3. How We Use Your Information</h2>
                <p>We use the information we collect for various purposes, including to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide, operate, and maintain our website and services</li>
                  <li>Process and manage your submissions</li>
                  <li>Improve, personalize, and expand our services</li>
                  <li>Understand and analyze how you use our website</li>
                  <li>Communicate with you, including for customer service and support</li>
                  <li>Send you updates, newsletters, and marketing communications (with your consent)</li>
                  <li>Detect, prevent, and address technical issues and security threats</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">4. Sharing Your Information</h2>
                <p>
                  We do not sell, trade, or rent your personal information to third parties. We may share your information
                  in the following situations:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Public Display:</strong> Information you submit (such as website URLs and descriptions) will be
                    publicly displayed on our directory
                  </li>
                  <li>
                    <strong>Service Providers:</strong> We may share information with third-party service providers who perform
                    services on our behalf (e.g., hosting, analytics)
                  </li>
                  <li>
                    <strong>Legal Requirements:</strong> We may disclose information if required by law or in response to valid
                    legal requests
                  </li>
                  <li>
                    <strong>Business Transfers:</strong> In connection with any merger, sale, or transfer of company assets
                  </li>
                </ul>
                <p className="text-sm pt-4">
                  <Link href="/legal" className="text-primary hover:underline">
                    View HiCyou Attribution License (HAL) →
                  </Link>
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">5. Data Security</h2>
                <p>
                  We implement appropriate technical and organizational security measures to protect your personal information
                  from unauthorized access, use, or disclosure. However, no method of transmission over the Internet or electronic
                  storage is 100% secure, and we cannot guarantee absolute security.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">6. Data Retention</h2>
                <p>
                  We retain your personal information only for as long as necessary to fulfill the purposes outlined in this
                  Privacy Policy, unless a longer retention period is required or permitted by law.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">7. Your Privacy Rights</h2>
                <p>Depending on your location, you may have certain rights regarding your personal information, including:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Access:</strong> Request access to your personal information</li>
                  <li><strong>Correction:</strong> Request correction of inaccurate information</li>
                  <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                  <li><strong>Objection:</strong> Object to processing of your personal information</li>
                  <li><strong>Data Portability:</strong> Request transfer of your information to another service</li>
                  <li><strong>Withdraw Consent:</strong> Withdraw consent where processing is based on consent</li>
                </ul>
                <p>To exercise these rights, please contact us using the information provided below.</p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">8. Third-Party Services</h2>
                <p>
                  Our website may contain links to third-party websites and services. We are not responsible for the privacy
                  practices or content of these third parties. We encourage you to read the privacy policies of any third-party
                  sites you visit.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">9. Children's Privacy</h2>
                <p>
                  Our services are not directed to children under the age of 13. We do not knowingly collect personal information
                  from children under 13. If we become aware that we have collected personal information from a child under 13,
                  we will take steps to delete such information.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">10. International Data Transfers</h2>
                <p>
                  Your information may be transferred to and maintained on computers located outside of your state, province,
                  country, or other governmental jurisdiction where data protection laws may differ. By using our services,
                  you consent to such transfers.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">11. Changes to This Privacy Policy</h2>
                <p>
                  We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
                  Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy
                  Policy periodically for any changes.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">12. California Privacy Rights</h2>
                <p>
                  If you are a California resident, you have specific rights regarding your personal information under the
                  California Consumer Privacy Act (CCPA), including the right to know what personal information we collect,
                  the right to delete personal information, and the right to opt-out of the sale of personal information.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">13. GDPR Compliance</h2>
                <p>
                  If you are located in the European Economic Area (EEA), you have certain data protection rights under the
                  General Data Protection Regulation (GDPR). We aim to take reasonable steps to allow you to correct, amend,
                  delete, or limit the use of your personal information.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">14. Contact Us</h2>
                <p>
                  If you have any questions about this Privacy Policy or our privacy practices, please contact us through
                  our website.
                </p>
              </section>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}

