// Starter prompt chips for the AI assistant, per language.

export const QUICK_PROMPTS: Record<string, string[]> = {
  english: [
    "How's business today?",
    "What's selling the most?",
    "Write a WhatsApp advert for my best product",
    "Who owes me the most?",
    "Should I increase any prices?",
  ],
  pidgin: [
    "How market today?",
    "Wetin dey sell pass?",
    "Make WhatsApp advert for my hot product",
    "Who dey owe me pass?",
    "I suppose increase any price?",
  ],
  yoruba: [
    "Báwo ni òwò ṣe rí lónìí?",
    "Kí ni ó ń tà jù?",
    "Kọ ìpolongo WhatsApp fún ọjà mi tó dára jù",
    "Ta ni ó jẹ mí ní gbèsè jù?",
    "Ṣé kí n gbé owó ọjà sókè?",
  ],
  igbo: [
    "Kedu ka ahịa si dị taa?",
    "Gịnị na-ere nke ọma?",
    "Dee mgbasa ozi WhatsApp maka ngwaahịa m kacha mma",
    "Onye ji m ụgwọ kachasị?",
    "M kwesịrị ịmụba ọnụ ahịa?",
  ],
  hausa: [
    "Yaya kasuwanci yake yau?",
    "Me ke sayarwa fiye da kowa?",
    "Rubuta talla na WhatsApp don kayana mafi kyau",
    "Wa ya fi bina bashi?",
    "Ya kamata in ƙara farashi?",
  ],
  chinese: [
    "今天生意怎么样？",
    "哪些产品卖得最好？",
    "为我最畅销的产品写一条 WhatsApp 广告",
    "谁欠我的钱最多？",
    "我应该提高价格吗？",
  ],
};

export function promptsForLanguage(lang: string | undefined | null): string[] {
  return QUICK_PROMPTS[lang || "english"] || QUICK_PROMPTS.english;
}
