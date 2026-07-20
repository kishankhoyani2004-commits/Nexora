import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from "recharts";

export function HiringGrowthChart({ data }: { data: { month: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="hiringGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5b4fee" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#5b4fee" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#918da3", fontSize: 12 }}
          dy={10}
        />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #e6e4f5", fontSize: 12 }}
          cursor={{ stroke: "#e6e4f5" }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#5b4fee"
          strokeWidth={2.5}
          fill="url(#hiringGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
