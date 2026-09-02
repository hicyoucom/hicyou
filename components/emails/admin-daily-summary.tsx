
import * as React from 'react';
import { EmailLayout, h1, text, hr, button } from './layout';
import { Section, Text, Button, Hr } from '@react-email/components';

interface AdminDailySummaryEmailProps {
    newSubmissionsCount: number;
    adminUrl: string;
    date: string;
}

export const AdminDailySummaryEmail = ({
    newSubmissionsCount = 0,
    adminUrl = 'https://hicyou.com/hi-studio/submissions',
    date = new Date().toLocaleDateString(),
}: AdminDailySummaryEmailProps) => {
    return (
        <EmailLayout preview={`Daily Summary: ${newSubmissionsCount} new submissions on ${date}`}>
            <Text style={h1}>Daily Submission Summary 📊</Text>

            <Text style={text}>
                Here is the summary for <strong>{date}</strong>.
            </Text>

            <Section style={{ backgroundColor: '#f0f9ff', padding: '24px', borderRadius: '8px', marginBottom: '24px', textAlign: 'center' }}>
                <Text style={{ fontSize: '48px', fontWeight: 'bold', color: '#0369a1', margin: '0' }}>
                    {newSubmissionsCount}
                </Text>
                <Text style={{ fontSize: '16px', color: '#0369a1', margin: '8px 0 0' }}>
                    New Submissions Detected
                </Text>
            </Section>

            <Text style={text}>
                Please review these new submissions in the admin dashboard.
            </Text>

            <Button style={{ ...button, backgroundColor: '#124CC9' }} href={adminUrl}>
                Go to Admin Dashboard
            </Button>

            <Hr style={hr} />

            <Text style={text}>
                This report covers the 24-hour period ending at 9:00 AM Beijing Time.
            </Text>
        </EmailLayout>
    );
};
