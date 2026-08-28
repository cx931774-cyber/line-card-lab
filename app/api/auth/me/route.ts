import { getSessionUser, paymentDetails } from "../../../lib/auth";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  const payment = await paymentDetails();
  return Response.json(
    {
      user,
      ...payment,
      prices: { monthly: 49, annual: 300, lifetime: 588 },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
