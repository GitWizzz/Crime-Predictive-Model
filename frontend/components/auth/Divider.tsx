export function Divider() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-zinc-800" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-zinc-950 px-2 text-zinc-400">or</span>
      </div>
    </div>
  );
}

