export type MascotMessage = {
  role: "user" | "assistant";
  content: string;
};

export type MascotRequest = {
  messages: MascotMessage[];
  context?: string;
  pageUrl?: string;
  pageTitle?: string;
};
