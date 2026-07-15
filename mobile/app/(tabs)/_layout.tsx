import { CalendarDays, ListChecks, Search, Settings } from 'lucide-react-native';
import { Tabs } from 'expo-router';
import { colors, typography } from '@/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.red,
        tabBarInactiveTintColor: colors.inkSubtle,
        tabBarLabelStyle: { fontSize: typography.caption, fontWeight: '600', marginTop: 2 },
        tabBarStyle: {
          height: 66,
          paddingTop: 7,
          paddingBottom: 7,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: '日历', tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} /> }} />
      <Tabs.Screen name="plans" options={{ title: '计划', tabBarIcon: ({ color, size }) => <ListChecks color={color} size={size} /> }} />
      <Tabs.Screen name="search" options={{ title: '搜索', tabBarIcon: ({ color, size }) => <Search color={color} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ title: '设置', tabBarIcon: ({ color, size }) => <Settings color={color} size={size} /> }} />
    </Tabs>
  );
}
