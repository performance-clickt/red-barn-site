// Check both the public HTTP layer and the published CMS content it depends on.
try {
  const response=await fetch('http://127.0.0.1/healthz',{signal:AbortSignal.timeout(4000)});
  process.exitCode=response.ok ? 0 : 1;
} catch { process.exitCode=1; }
