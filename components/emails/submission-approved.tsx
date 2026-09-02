
import * as React from 'react';
import { EmailLayout, h1, text, hr, button } from './layout';
import { Section, Text, Button, Hr } from '@react-email/components';

interface SubmissionApprovedEmailProps {
    userName: string;
    submissionTitle: string;
    submissionUrl: string;
}

export const SubmissionApprovedEmail = ({
    userName = 'User',
    submissionTitle = 'Your Website',
    submissionUrl = 'https://hicyou.com/tool/your-website',
}: SubmissionApprovedEmailProps) => {
    return (
        <EmailLayout preview={`Your submission ${submissionTitle} is live! 🚀`}>
            <Text style={h1}>Congratulations! Your submission is Live 🎉</Text>

            <Text style={text}>
                Hi {userName},
            </Text>

            <Text style={text}>
                Great news! We've reviewed and approved your submission <strong>{submissionTitle}</strong>. It is now <strong>LIVE</strong> on HiCyou and viewable by our community.
            </Text>

            <Text style={text}>
                You can view your listing here:
            </Text>

            <Section style={{ textAlign: 'center', marginTop: '32px', marginBottom: '32px' }}>
                <Button style={{ ...button, backgroundColor: '#124CC9' }} href={submissionUrl}>
                    View Your Listing
                </Button>
            </Section>

            <Hr style={hr} />

            <Text style={text}>
                <strong>Tip:</strong> Share your listing on social media to get more visibility!
            </Text>
        </EmailLayout>
    );
};
