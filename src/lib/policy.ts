const SEXUAL =
  /\b(?:pelad[oa]s?|nudez|nudes?|naked|topless|nsfw|porn(?:o|ografia|ô)?|er[oó]tic[oa]s?|sexo|sexual|buceta|p[eê]nis|vagina|seios|peitos|foder|nipples?|genitais|orgasmo|gozar|hentai|onlyfans|xxx)\b/i;

export const SEXUAL_BLOCK =
  "Não gero nem edito conteúdo sexual explícito, inclusive nudez.";

export function isSexualRequest(text: string): boolean {
  return SEXUAL.test(text);
}
