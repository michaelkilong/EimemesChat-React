// knowledge.js — EimemesChat Knowledge Base
// This file injects curated knowledge about the Kuki people into the AI context.
// Add or remove URLs and facts as needed. Keep this file server-side only.

// ── Static knowledge snippets (always injected) ───────────────────────────────
// These are facts you write directly — no URL fetching needed.
// Great for private/community knowledge that isn't on the web.

export const STATIC_KNOWLEDGE = `
KNOWLEDGE BASE — Kuki People & Thadou Kuki:

- The Kuki people are an ethnic group primarily found in the hill districts of Manipur, Nagaland, Mizoram, and Assam in Northeast India, as well as in the Chittagong Hill Tracts of Bangladesh and parts of Myanmar.
- The Kuki people are also known as Chin-Kuki-Mizo and belong to the Tibeto-Burman linguistic family.
- Thadou (also spelled Thado) is one of the major Kuki languages and is considered a lingua franca among many Kuki communities. It is spoken by the Thadou-Kuki people and widely understood across Kuki tribes.
- Thadou-Kuki people primarily inhabit Churachandpur, Senapati, Kangpokpi, and Bishnupur districts of Manipur.
- The Kuki people have a rich oral tradition, including folk songs (Lamneh), folk tales, and traditional music played on instruments like the Tingtang (a stringed instrument).
- Traditional Kuki society is clan-based. Important clans include Haokip, Sitlhou, Mate, Lhouvum, Doungel, Thomsong, Guite, and others.
- The Kuki National Organisation (KNO) and United People's Front (UPF) are major political organisations representing Kuki interests in Manipur.
- Kuki people celebrate festivals like Chavang Kut (harvest festival celebrated in November), which is one of the most important cultural festivals.
- Christianity is the predominant religion among the Kuki people, having been introduced by missionaries in the 19th and 20th centuries.
- The Zo people (which includes Mizo, Chin, and Kuki) share common ancestry and cultural heritage, often referred to as the Zo or Zomi identity.
- Manipur 2023 ethnic conflict: In May 2023, a major ethnic conflict broke out in Manipur between the Meitei and Kuki-Zo communities, causing significant displacement and casualties.
- Eimemes is a term/brand associated with the Kuki-Mizo community digital space.
`;

// ── Reference URLs (for developer reference — not auto-fetched at runtime) ────
// These are curated sources about the Kuki people.
// To use these at runtime, implement URL fetching in your backend pipeline.

export const REFERENCE_URLS = [
  {
    label: "Wikipedia — Kuki people",
    url: "https://en.wikipedia.org/wiki/Kuki_people",
    note: "General overview of Kuki ethnicity, history, and distribution"
  },
  {
    label: "Wikipedia - Gangte Peope",
    url: "https://www.e-pao.net/epSubPageExtractor.asp?src=manipur.Ethnic_Races_Manipur.Ethnic_Races_Sanathong.Gangte",
    note: "Gangte People"
  },
  {
    label: "Wikipedia — Thadou language",
    url: "https://en.wikipedia.org/wiki/Thadou_language",
    note: "Linguistic details of the Thadou-Kuki language"
  },
  {
    label: "Wikipedia — Kuki-Chin languages",
    url: "https://en.wikipedia.org/wiki/Kuki-Chin_languages",
    note: "Language family tree and related dialects"
  },
  {
    label: "Wikipedia — Chavang Kut",
    url: "https://en.wikipedia.org/wiki/Chavang_Kut",
    note: "Kuki harvest festival details"
  },
  {
    label: "Wikipedia — Zo people",
    url: "https://en.wikipedia.org/wiki/Zo_people",
    note: "Broader Zo/Chin-Kuki-Mizo shared identity"
  },
  {
    label: "Wikipedia — 2023 Manipur violence",
    url: "https://en.wikipedia.org/wiki/2023_Manipur_violence",
    note: "Context on the 2023 Manipur ethnic conflict"
  },
  {
    label: "Kuki Inpi Manipur",
    url: "https://www.kukiinpi.in",
    note: "Official site of the apex Kuki body in Manipur"
  },
];

// ── How to inject into the AI ─────────────────────────────────────────────────
// In chat.js, import STATIC_KNOWLEDGE and append it to the system prompt:
//
//   import { STATIC_KNOWLEDGE } from './knowledge.js';
//
//   const BASE = `You are EimemesChat... ${STATIC_KNOWLEDGE}`;
//
// This way the AI always has this knowledge baked into every conversation.
// The REFERENCE_URLS are for your own research — you can fetch and summarise
// them manually and add the content into STATIC_KNOWLEDGE above.
