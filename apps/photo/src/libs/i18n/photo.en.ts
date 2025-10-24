export type PhotoCopy = Readonly<{
  kiosk: Readonly<{
    title: string;
    description: string;
    actions: Readonly<{
      back: string;
      next: string;
    }>;
    statuses: Readonly<Record<string, string>>;
  }>;
}>;

export const photoCopyEn: PhotoCopy = {
  kiosk: {
    title: "AI Photo Booth",
    description:
      "Capture, style, and generate your portrait with festival themes powered by Gemini.",
    actions: {
      back: "Back",
      next: "Next",
    },
    statuses: {
      capturing: "Capturing",
      "selecting-theme": "Selecting Theme",
      generating: "Generating",
      completed: "Completed",
      failed: "Failed",
      expired: "Expired",
    },
  },
};
