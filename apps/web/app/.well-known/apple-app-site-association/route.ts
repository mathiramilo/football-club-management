import { appleAppSiteAssociation } from '@/lib/app-links';

export function GET() {
  return Response.json(appleAppSiteAssociation());
}
