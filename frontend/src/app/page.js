import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#101d22]">
      <main className="flex flex-col items-center gap-8 text-center">
        <h1 className="text-6xl font-bold text-white">
          Noto
        </h1>
        <p className="text-xl text-white/70 max-w-md">
          AI-powered music recognition. Identify any song in seconds.
        </p>
        <Link
          href="/test"
          className="mt-8 px-8 py-4 bg-[#36c3f2] text-[#101d22] text-lg font-bold rounded-full hover:shadow-[0_0_15px_2px_rgba(54,195,242,0.5)] transition-all duration-300 transform hover:scale-105"
        >
          Test Recognition →
        </Link>
      </main>
    </div>
  );
}
