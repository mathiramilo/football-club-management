import { androidAssetLinks } from '@/lib/app-links';

export function GET() {
  return Response.json(androidAssetLinks());
}
