import { LineChart, Line, XAxis, ResponsiveContainer, Tooltip } from "recharts";

export function RevenueUsageChart({
  data,
}: {
  data: { label: string; revenue: number; aiUsage: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8f8ca3", fontSize: 11 }} />
        <Tooltip contentStyle={{ background: "#1b1a29", border: "none", borderRadius: 12, fontSize: 12 }} />
        <Line type="monotone" dataKey="revenue" stroke="#7c72ff" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="aiUsage" stroke="#c084fc" strokeWidth={2} dot={false} strokeDasharray="0" />
      </LineChart>
    </ResponsiveContainer>
  );
}
