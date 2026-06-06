/** Map a grade string to a Tailwind text color class. */
export function gradeColor(grade: string | null | undefined): string {
  if (!grade) return "text-gray-400";
  if (grade.startsWith("A")) return "text-green-400";
  if (grade === "B+" || grade === "B") return "text-lime-400";
  if (grade === "B-" || grade === "C+") return "text-yellow-400";
  if (grade === "C" || grade === "C-") return "text-orange-400";
  if (grade === "D") return "text-red-400";
  return "text-red-600"; // F
}

/** Map a grade string to a hex badge background color (for Chrome badge). */
export function gradeBadgeColor(grade: string | null | undefined): chrome.action.BadgeBackgroundColorDetails["color"] {
  if (!grade) return [100, 100, 100, 255];
  if (grade.startsWith("A")) return [34, 197, 94, 255];   // green
  if (grade.startsWith("B")) return [132, 204, 22, 255];  // lime
  if (grade.startsWith("C")) return [234, 179, 8, 255];   // yellow
  if (grade === "D") return [249, 115, 22, 255];           // orange
  return [239, 68, 68, 255];                               // red (F)
}

/** Map a score to a color class for the large grade letter in the UI. */
export function gradeLetterColor(grade: string | null | undefined): string {
  if (!grade) return "text-gray-400";
  if (grade.startsWith("A")) return "text-green-400";
  if (grade.startsWith("B")) return "text-lime-400";
  if (grade.startsWith("C")) return "text-yellow-400";
  if (grade === "D") return "text-orange-500";
  return "text-red-500";
}
