import { Button } from "../../components/ui/Button";

export function ForgotPassword() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4">
      <section className="w-full max-w-md rounded-md border border-border bg-navy-surface p-6">
        <h1 className="text-2xl font-semibold">Reset password</h1>
        <input className="mt-6 w-full rounded-md border border-border bg-navy px-3 py-2" placeholder="Email" type="email" />
        <Button className="mt-4 w-full" type="button">Send reset link</Button>
      </section>
    </main>
  );
}
