import { NextRequest, NextResponse } from 'next/server';
import { SMSLogger } from '@/lib/services/sms';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hours = parseInt(searchParams.get('hours') || '24');
    
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    const endDate = new Date();

    const [stats, recentSMS, failedSMS] = await Promise.all([
      SMSLogger.getStats(startDate, endDate),
      SMSLogger.getRecent(50),
      SMSLogger.getFailedSMS(20),
    ]);

    return NextResponse.json({
      success: true,
      stats,
      recentSMS,
      failedSMS,
      period: {
        hours,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('SMS stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get SMS stats',
      },
      { status: 500 }
    );
  }
}
