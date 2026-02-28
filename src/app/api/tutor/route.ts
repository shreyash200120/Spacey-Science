import { NextRequest, NextResponse } from "next/server";
import { retrieveFacts } from "@/lib/lessonFacts";
import type { LessonFact } from "@/lib/lessonFacts";

type TutorClientMessage = {
  role: "user" | "assistant";
  content: string;
};

type TutorRequestBody = {
  messages: TutorClientMessage[];
  lessonStep?: number;
};

type TutorAction =
  | {
      type: "gotoStep";
      step: 1 | 2 | 3;
    }
  | {
      type: "focusPlanet";
      planetId: "moon" | "mars" | "earth" | "neptune" | "jupiter";
    };

type TutorResponseShape = {
  reply: {
    text: string;
  };
  actions: TutorAction[];
  usedFacts: string[];
};

function buildSystemPrompt(facts: LessonFact[], lessonStep?: number): string {
  const factsBlock =
    facts.length === 0
      ? "No extra facts were retrieved. Rely on the core gravity facts you know."
      : facts
          .map((fact) => `- (${fact.topic}) ${fact.text}`)
          .join("\n");

  return [
    "You are Spacey, a friendly science tutor helping a child understand gravity.",
    "The child is in an interactive lesson with 3 steps: 1) Intro story, 2) Gravity slider play, 3) Quiz.",
    lessonStep
      ? `They are currently around step ${lessonStep}.`
      : "They may be at any step in the lesson.",
    "",
    "You MUST respond ONLY with valid JSON matching this TypeScript type:",
    "",
    "type TutorResponse = {",
    '  reply: { text: string },',
    "  actions: (",
    '    | { type: "gotoStep"; step: 1 | 2 | 3 }',
    '    | { type: "focusPlanet"; planetId: "moon" | "mars" | "earth" | "neptune" | "jupiter" }',
    "  )[],",
    "  usedFacts: string[] // human-readable fact snippets you actually used",
    "};",
    "",
    "Rules:",
    "- Keep the language simple, warm, and age-appropriate.",
    "- Always explain your reasoning using grounded facts (no made-up astronomy).",
    "- Use actions sparingly to nudge the UI (for example, focus on a planet when explaining its gravity, or move to step 2 when it's time to experiment).",
    "- If the user asks a question that can't be answered safely, gently say you can't answer and avoid actions.",
    "",
    "Here are lesson facts you should ground your explanations in:",
    factsBlock,
  ].join("\n");
}

async function callOpenAIWithJson(
  body: TutorRequestBody,
  facts: LessonFact[],
): Promise<TutorResponseShape> {
  const apiKey = process.env.OPENAI_API_KEY;

  const lastUserMessage = [...(body.messages ?? [])]
    .reverse()
    .find((message) => message.role === "user");

  const userText = lastUserMessage?.content ?? "";
  const systemPrompt = buildSystemPrompt(facts, body.lessonStep);

  if (!apiKey) {
    return {
      reply: {
        text:
          "I’m your Spacey tutor! Right now there is no AI key configured, so I can only give simple built-in hints. On the Moon you would jump highest because its gravity is the weakest. Try moving to the play step and sliding gravity all the way down to see that effect.",
      },
      actions: userText.toLowerCase().includes("slider")
        ? [{ type: "gotoStep", step: 2 }]
        : [],
      usedFacts: facts.map((fact) => fact.text),
    };
  }

  const openAiMessages = [
    {
      role: "system",
      content: systemPrompt,
    },
    ...body.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: openAiMessages,
      temperature: 0.4,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI error:", errorText);
    return {
      reply: {
        text:
          "Here’s a quick grounded explanation: on the Moon you’d jump highest because its gravity is the weakest, on Earth you feel normal, and on Jupiter you’d feel much heavier because gravity is strongest. The lesson slider lets you see how jump height changes as gravity changes.",
      },
      actions: [],
      usedFacts: facts.map((fact) => fact.text),
    };
  }

  const json = (await response.json()) as {
    choices: { message: { content: string } }[];
  };
  const content = json.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Empty AI response");
  }

  try {
    const parsed = JSON.parse(content) as TutorResponseShape;

    if (!parsed.reply || typeof parsed.reply.text !== "string") {
      throw new Error("Invalid JSON shape from AI");
    }

    return parsed;
  } catch (error) {
    console.error("Failed to parse AI JSON:", error);

    return {
      reply: {
        text:
          "I had trouble formatting my answer correctly, but here’s a quick explanation: on the Moon you’d jump highest because its gravity is the weakest. On Jupiter you’d feel much heavier because gravity is stronger.",
      },
      actions: [],
      usedFacts: facts.map((fact) => fact.text),
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TutorRequestBody;
    const lastUserMessage = [...(body.messages ?? [])]
      .reverse()
      .find((message) => message.role === "user");
    const query = lastUserMessage?.content ?? "";

    const facts = retrieveFacts(query, 4);
    const tutorResponse = await callOpenAIWithJson(body, facts);

    return NextResponse.json<TutorResponseShape>(tutorResponse);
  } catch (error) {
    console.error("Tutor route error:", error);

    const fallback: TutorResponseShape = {
      reply: {
        text:
          "I’m sorry, something went wrong while asking the AI for help. You can still remember that the Moon has the weakest gravity, Earth is in the middle, and Jupiter has the strongest pull.",
      },
      actions: [],
      usedFacts: [],
    };

    return NextResponse.json(fallback, { status: 500 });
  }
}

