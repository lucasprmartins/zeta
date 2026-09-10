// Forma, foco e escala de texto comuns a todos os campos: definidos uma vez para
// que Input, Textarea e NativeSelect não divirjam ao serem editados.
export const controlBase =
  "w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-base shadow-xs outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/15 disabled:cursor-not-allowed aria-invalid:border-destructive md:text-sm";

// Caixas de seleção e opções nativas: mesmo alvo de toque e mesmo anel de foco.
export const controlMark =
  "size-5 shrink-0 cursor-pointer border-input accent-primary outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50";
