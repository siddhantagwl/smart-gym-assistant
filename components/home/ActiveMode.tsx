import ActiveSession from "@/components/ActiveSession";
import { WorkoutType } from "@/components/home/IdleMode";

export type ActiveSessionState = {
  id: string;
  startTime: Date;
  endTime: Date | null;
  workoutType: WorkoutType;
};

export default function ActiveMode(props: {
  session: ActiveSessionState;
  onEnd: () => void;
  colors: { text: string; accent: string };
  suggestedExercises: Record<WorkoutType, string[]>;
}) {
  const { session, onEnd, colors, suggestedExercises } = props;

  return (
    <ActiveSession
      activeSession={session}
      onEnd={onEnd}
      colors={colors}
      suggestedExercises={suggestedExercises}
    />
  );
}
