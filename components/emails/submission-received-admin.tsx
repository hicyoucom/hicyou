
import * as React from 'react';
import { EmailLayout, h1, text, button } from './layout';
import { Section, Text, Button } from '@react-email/components';

interface SubmissionReceivedAdminEmailProps {
    submitterName: string;
    submitterEmail: string;
    submissionTitle: string;
    submissionUrl: string;
    adminUrl: string;
}

export const SubmissionReceivedAdminEmail = ({
    submitterName = 'User',
    submitterEmail = 'user@example.com',
    submissionTitle = 'New Tool',
    submissionUrl = 'https://example.com',
    adminUrl = 'https://hicyou.com/hi-studio/submissions',
}: SubmissionReceivedAdminEmailProps) => {
    return (
        <EmailLayout preview={`New Submission: ${submissionTitle}`}>
            <Text style={h1}>New Submission! 🚀</Text>

            <Text style={text}>
                <strong>Title:</strong> {submissionTitle}<br />
                <strong>URL:</strong> {submissionUrl}<br />
                <strong>Submitter:</strong> {submitterName} ({submitterEmail})
            </Text>

            <Section style={{ textAlign: 'center', marginTop: '32px', marginBottom: '32px' }}>
                <Button style={button} href={adminUrl}>
                    Review Submission
                </Button>
            </Section>
        </EmailLayout>
    );
};
