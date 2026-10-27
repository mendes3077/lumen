const STOP = new Set(
  `a o os as um uma uns umas de da do das dos e em no na nos nas por para com sem sob sobre entre que se
não nao ou como mais muito já ja também tambem eu tu ele ela nós nos vos eles elas seu sua seus suas
the of and to in a is it for on with this that be are was were you your from at as by an`.split(
    /\s+/,
  ),
);

export function summarizeLocal(text: string, maxSentences = 5): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 40);
  if (sentences.length <= maxSentences) return sentences.join(" ");

  const freq = new Map<string, number>();
  for (const word of clean.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (word.length < 4 || STOP.has(word)) continue;
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }

  const ranked = sentences.map((sentence, index) => {
    let score = 0;
    const seen = new Set<string>();
    for (const word of sentence.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
      if (seen.has(word)) continue;
      seen.add(word);
      score += freq.get(word) ?? 0;
    }
    score /= Math.sqrt(sentence.length);
    if (index < 2) score *= 1.15;
    return { sentence, index, score };
  });

  return ranked
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence)
    .join(" ");
}
