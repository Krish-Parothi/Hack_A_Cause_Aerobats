export function gradeColor(grade: string) {
  switch (grade) {
    case "A": return "hsl(152, 69%, 41%)";
    case "B": return "hsl(142, 50%, 52%)";
    case "C": return "hsl(30, 90%, 56%)";
    case "D": return "hsl(0, 72%, 51%)";
    default: return "hsl(0, 0%, 50%)";
  }
}
