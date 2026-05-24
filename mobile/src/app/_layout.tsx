import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LedgerProvider } from "../context/LedgerContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LedgerProvider>
        <StatusBar style="dark" />
        <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#f5f0e6",
            borderTopWidth: 3,
            borderTopColor: "#2f2a20",
            height: 84,
            paddingBottom: 24,
            paddingTop: 10,
          },
          tabBarActiveTintColor: "#287c6f",
          tabBarInactiveTintColor: "#766e61",
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "900",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Timer",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "time" : "time-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="workspace"
          options={{
            title: "Workspace",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "briefcase" : "briefcase-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="workout"
          options={{
            title: "Workouts",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "fitness" : "fitness-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: "Calendar",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "calendar" : "calendar-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
      </Tabs>
      </LedgerProvider>
    </SafeAreaProvider>
  );
}
