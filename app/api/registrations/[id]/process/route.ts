import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { RegistrationStatus } from '@prisma/client';
import { t24AccountsService } from '@/lib/services/t24/accounts';
import type { ProcessStage } from '@/types/process-stages';
import { VALIDATION_STAGES } from '@/types/process-stages';
import { registrationPubSub } from '@/lib/redis/registration-pubsub';

/**
 * POST /api/registrations/[id]/process
 * Validate a registration by checking customer accounts in T24
 * Does NOT create user - only validates and stores account data for cron job
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const processLog: ProcessStage[] = [];
  const startTime = Date.now();

  function logStage(registrationId: number, stage: string, status: 'started' | 'completed' | 'failed', details?: string, error?: string) {
    const timestamp = new Date().toISOString();
    const lastStage = processLog[processLog.length - 1];
    const duration = lastStage && lastStage.stage === stage && lastStage.status === 'started'
      ? Date.now() - new Date(lastStage.timestamp).getTime()
      : undefined;

    processLog.push({
      stage,
      status,
      timestamp,
      duration,
      details,
      error,
    });

    // Publish stage update to Redis
    registrationPubSub.publishStageUpdate(
      registrationId,
      stage,
      status,
      details || error
    ).catch(err => console.error('Failed to publish stage update:', err));
  }

  try {
    const { id } = await params;
    const registrationId = parseInt(id);
    const body = await request.json();

    if (isNaN(registrationId)) {
      return NextResponse.json(
        { error: 'Invalid registration ID' },
        { status: 400 }
      );
    }

    // Get the registration request
    const registration = await prisma.requestedRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    if (registration.status !== RegistrationStatus.PENDING) {
      return NextResponse.json(
        { error: `Registration is already ${registration.status}` },
        { status: 400 }
      );
    }

    console.log(`🔍 Validating customer ${registration.customerNumber}...`);

    // Stage 1: Duplicate Check
    logStage(registrationId, VALIDATION_STAGES.DUPLICATE_CHECK, 'started');
    
    // Check if user already exists
    const existingUser = await prisma.mobileUser.findFirst({
      where: {
        OR: [
          { customerNumber: registration.customerNumber },
          { phoneNumber: registration.phoneNumber }
        ]
      },
      include: {
        profile: true,
      }
    });

    if (existingUser) {
      logStage(registrationId, VALIDATION_STAGES.DUPLICATE_CHECK, 'completed', 'User found - checking for updates');
      
      // Check if information has changed
      const hasChanges = 
        (registration.phoneNumber && registration.phoneNumber !== existingUser.phoneNumber) ||
        (registration.emailAddress && registration.emailAddress !== existingUser.profile?.email) ||
        (registration.firstName && registration.firstName !== existingUser.profile?.firstName) ||
        (registration.lastName && registration.lastName !== existingUser.profile?.lastName);

      if (hasChanges) {
        logStage(registrationId, 'update_user_info', 'started', 'Updating user information');
        
        try {
          // Update MobileUser phone if changed
          if (registration.phoneNumber && registration.phoneNumber !== existingUser.phoneNumber) {
            await prisma.mobileUser.update({
              where: { id: existingUser.id },
              data: { phoneNumber: registration.phoneNumber }
            });
          }

          // Update or create profile
          const profileData: any = {};
          if (registration.emailAddress) profileData.email = registration.emailAddress;
          if (registration.firstName) profileData.firstName = registration.firstName;
          if (registration.lastName) profileData.lastName = registration.lastName;
          if (registration.phoneNumber) profileData.phone = registration.phoneNumber;

          if (Object.keys(profileData).length > 0) {
            if (existingUser.profile) {
              await prisma.mobileUserProfile.update({
                where: { mobileUserId: existingUser.id },
                data: profileData
              });
            } else {
              await prisma.mobileUserProfile.create({
                data: {
                  mobileUserId: existingUser.id,
                  ...profileData
                }
              });
            }
          }

          logStage(registrationId, 'update_user_info', 'completed', 'User information updated successfully');

          // Mark registration as COMPLETED with update note
          await prisma.requestedRegistration.update({
            where: { id: registrationId },
            data: {
              status: RegistrationStatus.COMPLETED,
              mobileUserId: existingUser.id,
              processedAt: new Date(),
              processedBy: body.processedBy,
              notes: 'User already existed - information updated with new data',
            },
          });

          // Publish final status update
          await registrationPubSub.publishFinalStatus(
            registrationId,
            RegistrationStatus.COMPLETED,
            'User already exists - information updated',
            { updatedFields: Object.keys(profileData), existingUserId: existingUser.id },
            processLog
          );

          return NextResponse.json({
            success: true,
            status: 'COMPLETED',
            message: 'User already exists - information updated',
            updatedFields: Object.keys(profileData),
            processLog,
            totalDuration: Date.now() - startTime,
          });

        } catch (error) {
          logStage(registrationId, 'update_user_info', 'failed', 'Failed to update user information', error instanceof Error ? error.message : 'Unknown error');
          
          await prisma.requestedRegistration.update({
            where: { id: registrationId },
            data: {
              status: RegistrationStatus.FAILED,
              errorMessage: `Failed to update existing user: ${error instanceof Error ? error.message : 'Unknown error'}`,
              processedAt: new Date(),
              processedBy: body.processedBy,
              retryCount: registration.retryCount + 1,
              lastRetryAt: new Date(),
            },
          });

          // Publish failure status
          await registrationPubSub.publishFinalStatus(
            registrationId,
            RegistrationStatus.FAILED,
            'Failed to update existing user information',
            { error: error instanceof Error ? error.message : 'Unknown error' },
            processLog
          );

          return NextResponse.json({
            success: false,
            status: 'FAILED',
            message: 'Failed to update existing user information',
            error: error instanceof Error ? error.message : 'Unknown error',
            processLog,
          }, { status: 500 });
        }
      } else {
        // No changes - mark as duplicate
        logStage(registrationId, VALIDATION_STAGES.DUPLICATE_CHECK, 'completed', 'User exists with same information - no updates needed');
        
        await prisma.requestedRegistration.update({
          where: { id: registrationId },
          data: {
            status: RegistrationStatus.DUPLICATE,
            mobileUserId: existingUser.id,
            errorMessage: 'User already exists with identical information',
            processedAt: new Date(),
            processedBy: body.processedBy,
          },
        });

        // Publish duplicate status
        await registrationPubSub.publishFinalStatus(
          registrationId,
          RegistrationStatus.DUPLICATE,
          'User already exists with identical information',
          { existingUserId: existingUser.id },
          processLog
        );

        return NextResponse.json({
          success: false,
          status: 'DUPLICATE',
          message: 'User already exists with identical information',
          existingUserId: existingUser.id,
          processLog,
          totalDuration: Date.now() - startTime,
        }, { status: 409 });
      }
    }

    logStage(registrationId, VALIDATION_STAGES.DUPLICATE_CHECK, 'completed', 'No duplicate found');

    // Stage 2: T24 Account Lookup
    logStage(registrationId, VALIDATION_STAGES.T24_LOOKUP, 'started');
    
    // Lookup customer accounts in T24
    const accountsResult = await t24AccountsService.getCustomerAccountsDetailed(
      registration.customerNumber
    );

    if (!accountsResult.ok || !accountsResult.accounts || accountsResult.accounts.length === 0) {
      logStage(registrationId, VALIDATION_STAGES.T24_LOOKUP, 'failed', 'No accounts found', accountsResult.error || 'Customer has no accounts');
      
      // No accounts found - mark as FAILED
      const updated = await prisma.requestedRegistration.update({
        where: { id: registrationId },
        data: {
          status: RegistrationStatus.FAILED,
          errorMessage: accountsResult.error || 'No accounts found for customer',
          processedAt: new Date(),
          processedBy: body.processedBy,
          retryCount: registration.retryCount + 1,
          lastRetryAt: new Date(),
        },
        include: {
          processedByUser: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      console.log(`❌ Validation failed: No accounts found for ${registration.customerNumber}`);

      // Publish failure status
      await registrationPubSub.publishFinalStatus(
        registrationId,
        RegistrationStatus.FAILED,
        accountsResult.error || 'No accounts found for customer',
        { error: accountsResult.error || 'No accounts found' },
        processLog
      );

      return NextResponse.json({
        success: false,
        status: 'FAILED',
        data: updated,
        message: accountsResult.error || 'No accounts found for customer',
        processLog,
      }, { status: 400 });
    }

    logStage(registrationId, VALIDATION_STAGES.T24_LOOKUP, 'completed', `Found ${accountsResult.accounts.length} accounts`);

    // Stage 3: Account Validation
    logStage(registrationId, VALIDATION_STAGES.ACCOUNT_VALIDATION, 'started');
    logStage(registrationId, VALIDATION_STAGES.ACCOUNT_VALIDATION, 'completed', `Validated ${accountsResult.accounts.length} accounts`);

    // Stage 4: Status Update
    logStage(registrationId, VALIDATION_STAGES.STATUS_UPDATE, 'started');
    
    // Accounts found - mark as APPROVED and store validation data
    const validationData = {
      accounts: accountsResult.accounts,
      validatedAt: new Date().toISOString(),
      validatedBy: body.processedBy,
    };

    const updated = await prisma.requestedRegistration.update({
      where: { id: registrationId },
      data: {
        status: RegistrationStatus.APPROVED,
        validationData: validationData as any,
        processedAt: new Date(),
        processedBy: body.processedBy,
        notes: `Validated successfully. Found ${accountsResult.accounts.length} accounts. Ready for cron processing.`,
      },
      include: {
        processedByUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    logStage(registrationId, VALIDATION_STAGES.STATUS_UPDATE, 'completed', 'Status updated to APPROVED');

    console.log(`✅ Validation successful: Found ${accountsResult.accounts.length} accounts for ${registration.customerNumber}`);

    // Publish approved status
    await registrationPubSub.publishFinalStatus(
      registrationId,
      RegistrationStatus.APPROVED,
      `Customer validated successfully. Found ${accountsResult.accounts.length} accounts.`,
      { accountsFound: accountsResult.accounts.length },
      processLog
    );

    return NextResponse.json({
      success: true,
      status: 'APPROVED',
      data: updated,
      accountsFound: accountsResult.accounts.length,
      message: `Customer validated successfully. Found ${accountsResult.accounts.length} accounts.`,
      processLog,
      totalDuration: Date.now() - startTime,
    });

  } catch (error) {
    console.error('❌ Validation error:', error);
    
    // Update retry count on error
    try {
      const { id } = await params;
      const regId = parseInt(id);
      
      logStage(regId, 'error_handling', 'failed', 'Unexpected error', error instanceof Error ? error.message : 'Unknown error');
      
      await prisma.requestedRegistration.update({
        where: { id: regId },
        data: {
          retryCount: { increment: 1 },
          lastRetryAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown validation error',
        },
      });
    } catch (updateError) {
      console.error('Failed to update retry count:', updateError);
    }

    return NextResponse.json(
      { 
        error: 'Validation failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        processLog,
      },
      { status: 500 }
    );
  }
}
