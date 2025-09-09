import Link from "next/link";

export default function PlanetPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name || "");
  const display = name.charAt(0).toUpperCase() + name.slice(1);
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">{display}</h1>
          <Link href="/" className="text-slate-300 hover:text-white">Back</Link>
        </div>
        <p className="opacity-80 mb-4">This is a placeholder page for {display}. You can add content here.</p>
      </div>
    </div>
  );
}


