import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface Slice {
  label: string;
  value: number;
  color: string;
}

export function PortfolioDonutChart({ data, total, totalLabel }: { data: Slice[]; total: number; totalLabel: string }) {
  return (
    <div className="relative mx-auto flex h-44 w-44 items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={58}
            outerRadius={82}
            paddingAngle={3}
            stroke="none"
          >
            {data.map((slice) => (
              <Cell key={slice.label} fill={slice.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute flex flex-col items-center">
        <span className="text-3xl font-extrabold text-ink-900">{total}</span>
        <span className="text-xs text-ink-400">{totalLabel}</span>
      </div>
    </div>
  );
}
