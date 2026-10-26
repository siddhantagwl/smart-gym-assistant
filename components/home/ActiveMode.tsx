import ActiveSession from "@/components/ActiveSession";
import { Session } from "@/domain/session";

export default function ActiveMode(props: {
  session: Session;
  onEnd: () => void;
  colors: { text: string; accent: string };
  onScrollToTop?: () => void;
  onGymChange?: (gym: string) => void;
}) {
  const { session, onEnd, colors, onScrollToTop, onGymChange } = props;

  return (
    <ActiveSession
      activeSession={session}
      onEnd={onEnd}
      colors={colors}
      onScrollToTop={onScrollToTop}
      onGymChange={onGymChange}
    />
  );
}
