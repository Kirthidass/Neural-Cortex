import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal whether user exists
      return NextResponse.json({
        message: 'If an account exists, an OTP has been sent',
      });
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete old unused OTPs for this user
    await prisma.otpCode.deleteMany({
      where: { userId: user.id, used: false },
    });

    // Store OTP in database (expires in 10 minutes)
    await prisma.otpCode.create({
      data: {
        userId: user.id,
        code,
        type: 'password_reset',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // Send OTP via email using nodemailer
    try {
      const nodemailer = await import('nodemailer');

      // Use a test account if no SMTP is configured
      const smtpHost = process.env.SMTP_HOST;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (smtpHost && smtpUser && smtpPass) {
        const transporter = nodemailer.default.createTransport({
          host: smtpHost,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: false,
          auth: { user: smtpUser, pass: smtpPass },
        });

        await transporter.sendMail({
          from: `"Neural Cortex" <${smtpUser}>`,
          to: email,
          subject: 'Password Reset OTP - Neural Cortex',
          html: `
            <div style="background:#0a0a0f;color:#fff;padding:40px;border-radius:16px;font-family:sans-serif;">
              <h2 style="color:#00d4ff;">Neural Cortex Password Reset</h2>
              <p>Your OTP code is:</p>
              <div style="background:#1a1a2e;padding:20px;border-radius:12px;text-align:center;margin:20px 0;">
                <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#00d4ff;">${code}</span>
              </div>
              <p>This code expires in 10 minutes.</p>
              <p style="color:#888;font-size:12px;">If you didn't request this, please ignore this email.</p>
            </div>
          `,
        });
      } else {
        // No SMTP configured - log OTP to console for development
        console.log(`[DEV] OTP for ${email}: ${code}`);
      }
    } catch (emailError) {
      console.error('Email send error:', emailError);
      // OTP is still stored in DB, just couldn't send email
      console.log(`[FALLBACK] OTP for ${email}: ${code}`);
    }

    return NextResponse.json({
      message: 'If an account exists, an OTP has been sent',
    });
  } catch (error: unknown) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
