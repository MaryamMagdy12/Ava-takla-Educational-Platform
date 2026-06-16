import { useLocation } from "react-router-dom";
import { GA_BASE, SPECIAL_BASE } from "../navigation/adminPaths";

/**
 * @returns {"student"|"special"|"general_assembly"}
 */
export function useQuestionnaireScope() {
  const { pathname } = useLocation();
  if (pathname.startsWith(GA_BASE)) return "general_assembly";
  if (pathname.startsWith(SPECIAL_BASE)) return "special";
  return "student";
}
