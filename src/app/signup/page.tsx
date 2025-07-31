
import SignupForm from "./signup-form";

export default function SignupPage() {
  return (
    <main className="flex items-center justify-center md:h-screen">
      <div className="relative mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4 md:-mt-32">
        <div className="flex h-20 w-full items-end rounded-lg bg-blue-500 p-3 md:h-36">
          <div className="w-32 text-white md:w-36">
            <p>Acme Logo</p>
          </div>
        </div>
        <SignupForm />
        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <a href="/login" className="font-semibold text-blue-500">
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}
