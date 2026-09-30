export const TOKENS_DIR: string;

/** Writes themed CSS custom properties to `outFile`; resolves `true` if the file changed. */
export function buildTokens(outFile: string): Promise<boolean>;
