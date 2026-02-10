import { useCallback, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { getRecentSessions } from "@/db/sessions";
import { RecentSession } from "@/domain/session";

function formatShortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString(undefined, { month: "short" });
  return `${day} ${month}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(startIso: string, endIso?: string | null) {
  if (!endIso) return "";
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return "";

  const mins = Math.round((end - start) / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export default function RecentSessions(props: { limit?: number }) {
  const limit = props.limit ?? 3;
  const [items, setItems] = useState<RecentSession[]>([]);
  const router = useRouter();

  const load = useCallback(() => {
    const data = getRecentSessions(limit) as RecentSession[];
    setItems(data);
  }, [limit]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (items.length === 0) return null;

  return (
    <View
      style={{
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        marginBottom: 12,
        borderColor: "rgba(255,255,255,0.12)",
        backgroundColor: "rgba(255,255,255,0.04)",
      }}
    >
      <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
        Recent sessions
      </Text>

      <View style={{ marginTop: 8 }}>
        {items.map((s) => (
          <View
            key={s.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 6,
            }}
          >
            <View>
              <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 14 }}>
                {formatShortDate(s.startTime)} · {formatTime(s.startTime)}
              </Text>
              {s.endTime && (
                <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
                  {formatDuration(s.startTime, s.endTime)}
                </Text>
              )}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {s.source === "manual" && (
                <View
                  style={{
                    paddingVertical: 2,
                    paddingHorizontal: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    marginRight: 8,
                    borderColor: "rgba(34,197,94,0.55)",
                    backgroundColor: "rgba(34,197,94,0.12)",
                  }}
                >
                  <Text style={{ color: "rgba(34,197,94,0.95)", fontSize: 12 }}>
                    Manual
                  </Text>
                </View>
              )}

              <View
                style={{
                  paddingVertical: 3,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.12)",
                  backgroundColor: "rgba(0,0,0,0.35)",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 13 }}>
                  {s.sessionLabel?.trim() || "Session"}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
      <View style={{ alignItems: "center", marginTop: 6 }}>
        <Pressable
          onPress={() => router.push("/(tabs)/history")}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
            See more
          </Text>
        </Pressable>
      </View>
    </View>
  );
}