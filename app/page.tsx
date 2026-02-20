// Landing page at the root URL (/).
// Brief intro, single CTA to the guest demo at /en-us/example.
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-sm w-full">
        {/* Camera emoji as logo placeholder */}
        <div className="text-6xl mb-6">📷</div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Rental Manager
        </h1>
        <p className="text-gray-500 text-base mb-10 leading-relaxed">
          Streamlined camera rental management for concert events. Track
          devices, manage orders, and stay conflict-free.
        </p>

        <Link
          href="/en-us/example"
          className="block w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-base py-3 px-6 rounded-xl shadow-sm transition-colors"
        >
          Continue as Guest →
        </Link>

        <p className="text-xs text-gray-400 mt-4">
          Have a unique link? Use the URL provided by your admin.
        </p>
      </div>

      <footer className="absolute bottom-6 text-xs text-gray-400">
        © {new Date().getFullYear()} Rental Manager
      </footer>
    </main>
  );
}
