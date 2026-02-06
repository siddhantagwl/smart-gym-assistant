import { View } from "react-native";
import { useEffect, useState } from "react";
import { initDb } from "@/db/schema";
import { getAllSessions, StoredSession } from "@/db/sessions";
import { History } from "../../components/history";

const colors = {
  background: "#0F0F0F",
};

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<StoredSession[]>([]);

  useEffect(() => {
    initDb();
    const data = getAllSessions();
    setSessions(data);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
      <History sessions={sessions} />
    </View>
  );
}