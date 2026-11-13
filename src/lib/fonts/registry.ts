// Fontes disponíveis no seletor de preferências. Os arquivos vêm dos pacotes
// @fontsource-variable/*, importados em src/main.tsx. Para adicionar uma fonte:
// instale o pacote, importe-o no main.tsx, declare a variável --font-* no
// globals.css e acrescente a chave aqui.
export const fontRegistry = {
  geist: { label: "Geist" },
  inter: { label: "Inter" },
  geistMono: { label: "Geist Mono" },
} as const;

export type FontKey = keyof typeof fontRegistry;

export const fontKeys = Object.keys(fontRegistry) as FontKey[];

export const fontOptions = fontKeys.map((key) => ({
  key,
  label: fontRegistry[key].label,
}));
