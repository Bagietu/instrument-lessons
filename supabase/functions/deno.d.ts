// The parts of the Deno runtime the functions use, for type-checking under Node.
declare namespace Deno {
  const env: { get(key: string): string | undefined }
  function serve(handler: (req: Request) => Response | Promise<Response>): unknown
}
