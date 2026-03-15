// src/app/page.tsx
import LeechForm from "@/components/leech-form";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-sans bg-black text-white">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full max-w-md">
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left logo-container w-full">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-red-600 mb-2">
            CRIMSON
          </h1>
          <p className="text-xl text-red-200/80 font-light">
            Serverless Stream Stitcher
          </p>
        </div>
        
        <div className="w-full">
          <LeechForm />
        </div>
        
        <div className="text-sm text-neutral-500 mt-8 w-full text-center sm:text-left">
          <p>
            Powered by <b className="text-neutral-400">GitHub Actions</b> & <b className="text-neutral-400">Cloudflare Workers</b>.
          </p>
        </div>
      </main>
      
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center text-neutral-600">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source Code
        </a>
      </footer>
    </div>
  );
}
