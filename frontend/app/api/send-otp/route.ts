import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            to,
            subject,
            html,
            smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com',
            smtpPort = Number(process.env.SMTP_PORT || 465),
            smtpUser = process.env.SMTP_USER,
            smtpPass = process.env.SMTP_PASS,
            fromName = 'TrackPro GPS',
        } = body;

        if (!to || !subject || !html || !smtpUser || !smtpPass) {
            return NextResponse.json(
                { delivered: false, error: 'Missing email or SMTP credentials' },
                { status: 400 }
            );
        }

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number(smtpPort),
            secure: Number(smtpPort) === 465,
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });

        await transporter.sendMail({
            from: `"${fromName}" <${smtpUser}>`,
            to,
            subject,
            html,
        });

        return NextResponse.json({ delivered: true, provider: 'vercel-smtp' });
    } catch (err: any) {
        console.error('[Vercel send-otp] Error:', err?.message || err);
        return NextResponse.json(
            { delivered: false, error: err?.message || 'SMTP send failed' },
            { status: 500 }
        );
    }
}
