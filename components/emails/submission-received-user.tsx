
import * as React from 'react';
import { EmailLayout, h1, text, hr, button } from './layout';
import { Section, Text, Button, Hr } from '@react-email/components';

interface SubmissionReceivedUserEmailProps {
    userName: string;
    submissionTitle: string;
    statusUrl: string;
}

export const SubmissionReceivedUserEmail = ({
    userName = 'User',
    submissionTitle = 'Your Website',
    statusUrl = 'https://hicyou.com/hi-studio',
}: SubmissionReceivedUserEmailProps) => {
    return (
        <EmailLayout preview={`We received your submission: ${submissionTitle}`}>
            <Text style={h1}>Submission Received! 🎉</Text>

            <Text style={text}>
                Hi {userName},
            </Text>

            <Text style={text}>
                Thanks for submitting <strong>{submissionTitle}</strong> to HiCyou! We've received your request and it's currently in our review queue.
            </Text>

            <Section style={{ backgroundColor: '#f0f9ff', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
                <Text style={{ ...text, margin: 0, fontWeight: 'bold', color: '#0369a1' }}>
                    Want a Dofollow Link?
                </Text>
                <Text style={{ ...text, marginTop: '8px', marginBottom: '16px', fontSize: '14px' }}>
                    Add our badge to your website and verify it to make this submission eligible for a <strong>Dofollow</strong> backlink if it is published.
                </Text>
                <Button style={{ ...button, backgroundColor: '#124CC9' }} href={statusUrl}>
                    Verify Badge & Check Status
                </Button>
            </Section>

            <Text style={text}>
                <strong>Review Timeline:</strong> Because we manually review every submission to ensure quality, this usually takes <strong>2-5 business days</strong>.
            </Text>

            <Hr style={hr} />

            <Text style={text}>
                We'll notify you via email once the review is complete and your tool is published.
            </Text>
        </EmailLayout>
    );
};
