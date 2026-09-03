
import * as React from 'react';
import { EmailLayout, h1, text, hr, button } from './layout';
import { Section, Text, Button, Hr } from '@react-email/components';

interface SubmissionRejectedEmailProps {
    userName: string;
    submissionTitle: string;
    guidelinesUrl?: string;
}

export const SubmissionRejectedEmail = ({
    userName = 'User',
    submissionTitle = 'Your Website',
    guidelinesUrl = 'https://hicyou.com/submit',
}: SubmissionRejectedEmailProps) => {
    return (
        <EmailLayout preview={`Update regarding your submission: ${submissionTitle}`}>
            <Text style={h1}>Submission Status Update</Text>

            <Text style={text}>
                Hi {userName},
            </Text>

            <Text style={text}>
                Thank you for submitting <strong>{submissionTitle}</strong> to HiCyou.
            </Text>

            <Text style={text}>
                After carefully reviewing your submission, we regret to inform you that we are unable to publish it at this time. This usually happens if the submission doesn't meet our directory guidelines (e.g. low quality, spam, broken link, or irrelevant category).
            </Text>

            <Section style={{ textAlign: 'center', marginTop: '32px', marginBottom: '32px' }}>
                <Button style={button} href={guidelinesUrl}>
                    Review Guidelines & Try Again
                </Button>
            </Section>

            <Hr style={hr} />

            <Text style={text}>
                If you believe this is a mistake, please feel free to reply to this email.
            </Text>
        </EmailLayout>
    );
};
