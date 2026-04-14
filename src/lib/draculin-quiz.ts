export interface QuizQuestion {
  text: string;
  scoreYes: number;
  scoreNo: number;
}

export function quizScore(
  answers: boolean[],
  questions: QuizQuestion[],
): number {
  let score = 0;
  for (let i = 0; i < answers.length && i < questions.length; i++) {
    score += answers[i] ? questions[i].scoreYes : questions[i].scoreNo;
  }
  return score;
}

export type Severity = "mild" | "moderate" | "severe";

export function scoreBand(score: number): Severity {
  if (score <= 3) return "mild";
  if (score <= 7) return "moderate";
  return "severe";
}

export const BLOOD_DATA: Record<string, number> = {
  Mon: 5,
  Tue: 10,
  Wed: 7,
  Thu: 15,
  Fri: 8,
  Sat: 4,
  Sun: 6,
};

export const PERIOD_DAYS = [2, 3, 4, 5, 28, 29, 30];

export const FALLBACK_NEWS = [
  {
    title: "La Marató 2023",
    link: "https://www.ccma.cat/tv3/marato/",
    img: "https://pessebre.org/wp-content/uploads/2022/12/logo-lamarato_normal.jpg",
  },
  {
    title: "Las farmacias catalanas distribuirán productos menstruales gratuitos a partir de 2024",
    link: "https://elpais.com/espana/catalunya/2023-09-21/las-farmacias-catalanas-distribuiran-productos-menstruales-gratuitos-a-partir-de-2024.html",
    img: "",
  },
  {
    title: "Cómo ayudar a tu hija a superar el miedo al uso del tampón y la copa menstrual",
    link: "https://elpais.com/mamas-papas/expertos/2023-08-28/como-ayudar-a-tu-hija-a-superar-el-miedo-al-uso-del-tampon-y-la-copa-menstrual.html",
    img: "",
  },
];
