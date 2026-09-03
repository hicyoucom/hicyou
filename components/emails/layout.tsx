
import * as React from 'react';
import {
    Body,
    Container,
    Head,
    Html,
    Link,
    Preview,
    Section,
    Text,
    Img,
} from '@react-email/components';

interface EmailLayoutProps {
    preview?: string;
    children: React.ReactNode;
}

export const EmailLayout = ({ preview, children }: EmailLayoutProps) => {
    return (
        <Html>
            <Head />
            {preview && <Preview>{preview}</Preview>}
            <Body style={main}>
                <Container style={container}>
                    <Section style={logoSection}>
                        <Img
                            src={`${process.env.NEXT_PUBLIC_SITE_URL}/logo.png`}
                            width="200"
                            height="75"
                            alt="HiCyou"
                            style={{ ...logo, maxWidth: '100%', height: 'auto' }}
                        />
                    </Section>

                    <Section style={contentSection}>
                        {children}
                    </Section>

                    <Text style={footer}>
                        © {new Date().getFullYear()} HiCyou. All rights reserved.
                        <br />
                        <Link href="https://hicyou.com" style={footerLink}>
                            hicyou.com
                        </Link>
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

// Styles
const main = {
    backgroundColor: '#f6f9fc',
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
};

const logoSection = {
    padding: '20px',
    textAlign: 'center' as const,
};

const logo = {
    margin: '0 auto',
};

const contentSection = {
    padding: '0 48px',
};

const footer = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
    textAlign: 'center' as const,
    marginTop: '32px',
};

const footerLink = {
    color: '#8898aa',
    textDecoration: 'underline',
};

export const h1 = {
    color: '#333',
    fontSize: '24px',
    fontWeight: 'bold',
    paddingTop: '32px',
    paddingBottom: '32px',
    textAlign: 'center' as const,
    margin: '0',
};

export const text = {
    color: '#525f7f',
    fontSize: '16px',
    lineHeight: '24px',
    textAlign: 'left' as const,
};

export const button = {
    backgroundColor: '#000000',
    borderRadius: '5px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'block',
    width: '100%',
    padding: '10px',
};

export const hr = {
    borderColor: '#e6ebf1',
    margin: '20px 0',
};
