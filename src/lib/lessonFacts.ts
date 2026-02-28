export type LessonFact = {
  id: string;
  topic: string;
  keywords: string[];
  text: string;
};

const FACTS: LessonFact[] = [
  {
    id: "gravity-definition",
    topic: "gravity",
    keywords: ["gravity", "force", "pull", "mass", "weight"],
    text: "Gravity is an attractive force between objects with mass. Planets pull you toward their centres, which makes you feel weight.",
  },
  {
    id: "gravity-vs-mass",
    topic: "gravity",
    keywords: ["mass", "planet size", "bigger planet", "stronger gravity"],
    text: "The more mass a planet has, the stronger its gravity near the surface. That usually makes you feel heavier on larger, denser planets.",
  },
  {
    id: "moon-gravity",
    topic: "moon",
    keywords: ["moon", "luna", "weakest", "jump highest"],
    text: "The Moon has about 1/6th (roughly 0.17g) of Earth's gravity, so you would jump highest and fall in slow motion there.",
  },
  {
    id: "earth-gravity",
    topic: "earth",
    keywords: ["earth", "normal", "1g"],
    text: "On Earth we call the local gravity 1g. Everyday activities like walking and running are tuned to this strength.",
  },
  {
    id: "jupiter-gravity",
    topic: "jupiter",
    keywords: ["jupiter", "strongest", "heaviest"],
    text: "Jupiter's gravity at the cloud tops is more than twice Earth's (about 2.5g), so you would feel much heavier and jumps would be very small.",
  },
  {
    id: "mars-gravity",
    topic: "mars",
    keywords: ["mars", "red planet"],
    text: "Mars has about 0.38g. You would jump higher than on Earth, but not as dramatically as on the Moon.",
  },
  {
    id: "neptune-gravity",
    topic: "neptune",
    keywords: ["neptune", "blue planet"],
    text: "Neptune's surface gravity is slightly stronger than Earth's (about 1.14g), so you would feel a bit heavier but still able to move.",
  },
];

export function retrieveFacts(query: string, limit = 4): LessonFact[] {
  const cleaned = query.toLowerCase();

  const scored = FACTS.map((fact) => {
    const score = fact.keywords.reduce((acc, keyword) => {
      return cleaned.includes(keyword.toLowerCase()) ? acc + 1 : acc;
    }, 0);
    return { fact, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const nonZero = scored.filter((item) => item.score > 0);
  const pool = nonZero.length > 0 ? nonZero : scored;

  return pool.slice(0, limit).map((item) => item.fact);
}

