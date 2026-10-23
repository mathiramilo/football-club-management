import type { PrismaClient } from '../../../src/generated/prisma/client.js';
import { AuthError } from './auth-error.js';
import type { VerifiedIdentity } from './id-token-verifier.js';

type SignInIdentity = Pick<VerifiedIdentity, 'subject' | 'email' | 'emailVerified'> & {
  provider: VerifiedIdentity['provider'] | 'email';
};

export async function findOrCreateUser(
  db: PrismaClient,
  identity: SignInIdentity,
  now: Date,
): Promise<string> {
  const known = await db.authIdentity.findUnique({
    where: {
      provider_providerSubject: { provider: identity.provider, providerSubject: identity.subject },
    },
    select: { userId: true },
  });
  if (known) return known.userId;

  // BR-AUTH-01: an account is a verified email; an unverified provider email is never linked or registered.
  if (!identity.emailVerified) throw new AuthError('EMAIL_NOT_VERIFIED');

  return db.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: identity.email },
      create: { email: identity.email, emailVerifiedAt: now },
      update: {},
      select: { id: true, emailVerifiedAt: true },
    });
    if (!user.emailVerifiedAt) {
      await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: now } });
    }
    await tx.authIdentity.create({
      data: {
        userId: user.id,
        provider: identity.provider,
        providerSubject: identity.subject,
        providerEmail: identity.email,
      },
    });
    return user.id;
  });
}
