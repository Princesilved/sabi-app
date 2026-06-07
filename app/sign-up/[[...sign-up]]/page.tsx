import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-3 h-3 bg-jollof rounded-full" />
          <span className="font-display text-3xl italic">Sabi</span>
        </div>
        <p className="text-ink/60 text-sm">Run your business smarter.</p>
      </div>
      <SignUp />
    </div>
  );
}
