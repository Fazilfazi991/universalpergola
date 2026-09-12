import { DatabaseZap } from "lucide-react";

export function ConfigurationState({ context = "catalogue" }: { context?: string }) {
  return <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-line bg-paper px-6 text-center"><div className="max-w-md"><DatabaseZap className="mx-auto text-brass-dark" size={28} strokeWidth={1.6} /><h2 className="mt-4 text-lg font-semibold">Supabase connection required</h2><p className="mt-2 text-sm leading-6 text-stone">The {context} uses the production Supabase data layer. Add the Universal Pergola project URL and publishable key to show live records; development fixtures are never substituted here.</p></div></div>;
}
