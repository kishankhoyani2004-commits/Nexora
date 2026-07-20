import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from "recharts";

export function SignupTrendsChart({ data }: { data: { time: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#8f8ca3", fontSize: 11 }} />
        <Tooltip contentStyle={{ background: "#1b1a29", border: "none", borderRadius: 12, fontSize: 12 }} />
        <Bar dataKey="value" fill="#4c3fd6" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
