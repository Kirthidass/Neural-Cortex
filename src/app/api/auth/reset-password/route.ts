import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { email, resetToken, newPassword } = await req.json();

    if (!email || !resetToken || !newPassword) {
      return NextResponse.json(
        { error: 'Email, reset token, and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Verify reset token
    const tokenRecord = await prisma.otpCode.findFirst({
      where: {
        userId: user.id,
        code: resetToken,
        type: 'reset_token',
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!tokenRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Mark token as used
    await prisma.otpCode.update({
      where: { id: tokenRecord.id },
      data: { used: true },
    });

    // Hash new password and update user
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        needsPassword: false,
      },
    });

    // Clean up old OTPs
    await prisma.otpCode.deleteMany({
      where: { userId: user.id, used: true },
    });

    return NextResponse.json({ message: 'Password reset successfully' });
  } catch (error: unknown) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
