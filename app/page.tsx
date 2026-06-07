import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="px-6 lg:px-10 py-6 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-jollof rounded-full" />
          <span className="font-display text-2xl italic">Sabi</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sign-in" className="text-sm text-ink/70 hover:text-ink px-4 py-2">
            Sign in
          </Link>
          <Link href="/sign-up" className="sabi-btn-primary !py-2 !px-4 text-xs">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 lg:px-10 max-w-7xl mx-auto pt-16 pb-24">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-jollof/10 text-jollof rounded-full text-xs uppercase tracking-widest font-medium mb-8">
            <span className="w-1.5 h-1.5 bg-jollof rounded-full animate-pulse" />
            Africa's first AI business OS
          </div>

          <h1 className="font-display text-6xl lg:text-8xl leading-[0.95] mb-8">
            The AI manager,
            <br />
            <span className="italic text-jollof">accountant,</span> and marketer
            <br />
            your business has been{" "}
            <span className="italic">waiting for.</span>
          </h1>

          <p className="text-xl text-ink/70 max-w-2xl mb-10 leading-relaxed">
            Talk to your business in English, Pidgin, Yorùbá, Igbo, or Hausa.
            Log sales by sending a WhatsApp message. Get advice from an AI that
            actually understands the Nigerian market.
          </p>

          <div className="flex flex-wrap gap-3 mb-16">
            <Link href="/sign-up" className="sabi-btn-jollof !py-4 !px-7 text-base">
              Start free →
            </Link>
            <Link href="/sign-in" className="sabi-btn-secondary !py-4 !px-7 text-base">
              I already have an account
            </Link>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl">
            <Feature
              title="Dashboard"
              body="See revenue, profit, debt, and stock health at a glance."
            />
            <Feature
              title="AI Assistant"
              body="Ask your business anything. Get answers in your language."
            />
            <Feature
              title="One tap logging"
              body="Sales, expenses, inventory, debt — all in seconds."
            />
          </div>
        </div>
      </section>

      {/* Bottom band */}
      {/* Pricing */}
      <section className="px-6 lg:px-10 max-w-7xl mx-auto py-20">
        <div className="text-xs uppercase tracking-widest text-jollof font-medium mb-2">
          Pricing
        </div>
        <h2 className="font-display text-4xl lg:text-5xl mb-3">
          Start free. <span className="italic">Grow when you're ready.</span>
        </h2>
        <p className="text-ink/60 max-w-2xl mb-10">
          Paid plans come with a full 3-month free trial. No card needed to start.
        </p>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              name: "Hustler",
              price: "Free",
              tagline: "Solo trader getting started",
              features: [
                "1 business",
                "Just you",
                "Sales, expenses, inventory, customers",
                "AI assistant (Gemini)",
                "Receipt scanning",
              ],
              highlight: false,
            },
            {
              name: "Trader",
              price: "₦5,000",
              suffix: "/month",
              tagline: "Growing shop with a small team",
              features: [
                "Up to 3 businesses",
                "Up to 5 staff per business",
                "Team roles & permissions",
                "Everything in Hustler",
                "3 months free trial",
              ],
              highlight: true,
            },
            {
              name: "Empire",
              price: "₦20,000",
              suffix: "/month",
              tagline: "Multiple locations, serious scale",
              features: [
                "Unlimited businesses",
                "Unlimited staff",
                "Advanced analytics",
                "Everything in Trader",
                "3 months free trial",
              ],
              highlight: false,
            },
          ].map((p) => (
            <div
              key={p.name}
              className="rounded-2xl p-6 flex flex-col"
              style={{
                border: p.highlight
                  ? "2px solid var(--jollof)"
                  : "1px solid var(--border)",
                background: p.highlight ? "rgba(212,70,33,0.04)" : "var(--paper)",
              }}
            >
              <div className="font-display text-2xl">{p.name}</div>
              <div className="text-ink/50 text-sm mb-4">{p.tagline}</div>
              <div className="mb-5">
                <span className="font-display text-4xl text-jollof">{p.price}</span>
                {p.suffix && <span className="text-ink/50 text-sm">{p.suffix}</span>}
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="text-sm flex items-start gap-2">
                    <span className="text-moss mt-0.5">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className={p.highlight ? "sabi-btn-jollof w-full" : "sabi-btn-secondary w-full"}
              >
                {p.name === "Hustler" ? "Start free" : "Start 3-month trial"}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ink text-cream py-16">
        <div className="px-6 lg:px-10 max-w-7xl mx-auto">
          <h2 className="font-display text-4xl lg:text-5xl mb-4">
            Built for the way <span className="italic text-jollof">we actually do business.</span>
          </h2>
          <p className="text-cream/70 max-w-2xl mb-10">
            Sliding markets, NEPA wahala, customer debts, multiple suppliers,
            cash + transfer + POS + credit. Sabi understands all of it because
            it was built by someone running a business in Lagos.
          </p>
          <Link href="/sign-up" className="sabi-btn-jollof !py-4 !px-7 text-base">
            Try it free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 lg:px-10 py-10 max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4 text-sm text-ink/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-jollof rounded-full" />
          <span className="font-display italic">Sabi</span>
          <span>·</span>
          <span>Made in Lagos, for Africa.</span>
        </div>
        <div className="flex gap-5">
          <Link href="/sign-in" className="hover:text-ink">Sign in</Link>
          <Link href="/sign-up" className="hover:text-ink">Sign up</Link>
        </div>
      </footer>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="sabi-card">
      <div className="font-display text-2xl mb-2">{title}</div>
      <p className="text-sm text-ink/60 leading-relaxed">{body}</p>
    </div>
  );
}
