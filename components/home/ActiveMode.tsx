import ActiveSession from "@/components/ActiveSession";
import { Session } from "@/domain/session";

export default function ActiveMode(props: {
  session: Session;
  onEnd: () => void;
  colors: { text: string; accent: string };
}) {
  const { session, onEnd, colors } = props;

  return (
    <ActiveSession
      activeSession={session}
      onEnd={onEnd}
      colors={colors}
    />
  );
}
