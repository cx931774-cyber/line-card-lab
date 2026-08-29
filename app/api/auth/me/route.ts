import { getSessionUser, paymentDetails } from "../../../lib/auth";

export async function GET(request: Request) {
  const [user, payment] = await Promise.all([getSessionUser(request), paymentDetails()]);
  return Response.json(
    {
      user,
      ...payment,
      prices: { monthly: 19.9, annual: 89, lifetime: 299 },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
