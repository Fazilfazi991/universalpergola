import { BrandMark } from "@/components/brand-mark";
import { PublicFeedbackForm } from "@/components/feedback/public-feedback-form";
import { getPublicFeedbackContext } from "@/lib/feedback/queries";

export const metadata = { title: "Customer feedback" };

export default async function FeedbackPage({ params }: PageProps<"/feedback/[token]">) {
  const { token } = await params;
  const context = await getPublicFeedbackContext(token);
  return (
    <main className="min-h-screen bg-limestone px-4 py-8 sm:py-14">
      <div className="mx-auto max-w-xl">
        <BrandMark />
        <section className="mt-8 overflow-hidden rounded-xl border border-line bg-paper shadow-[0_24px_70px_rgba(23,23,20,0.08)]">
          <div className="border-b border-line bg-graphite px-5 py-7 text-white sm:px-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-brass">Project experience</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em]">Your perspective matters.</h1>
            <p className="mt-3 text-sm leading-6 text-white/60">A short review helps us improve every design, installation, and handover.</p>
          </div>
          <div className="p-5 sm:p-8">
            {!context ? <div role="alert"><h2 className="text-lg font-semibold">This link is not available.</h2><p className="mt-2 text-sm leading-6 text-stone">It may have expired or been revoked. Please contact Universal Pergola for a new link.</p></div>
              : context.feedback_state !== "requested" ? <div role="status"><h2 className="text-lg font-semibold">Feedback already received.</h2><p className="mt-2 text-sm leading-6 text-stone">Thank you for sharing your experience for project {context.project_reference}.</p></div>
              : <><div className="mb-6 flex items-center justify-between gap-4 border-b border-line pb-4"><div><p className="text-xs text-stone">Project reference</p><p className="mt-1 font-semibold">{context.project_reference}</p></div><p className="text-right text-xs text-stone">Secure project-specific form</p></div><PublicFeedbackForm token={token} /></>}
          </div>
        </section>
        <p className="mt-5 text-center text-xs leading-5 text-stone">This form does not expose your customer, quotation, payment, or project history.</p>
      </div>
    </main>
  );
}
