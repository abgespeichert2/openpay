import { notFound } from "next/navigation";
import { PaymentStatusPanel } from "@/app/[identifier]/panel";
import { paymentExists } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PaymentPageProps {
  params: Promise<{
    identifier: string;
  }>;
}

export default async function PaymentPage({ params }: PaymentPageProps) {
  const { identifier } = await params;

  if (!(await paymentExists(identifier))) {
    notFound();
  }

  return <PaymentStatusPanel identifier={identifier} />;
}
