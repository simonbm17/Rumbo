"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthPoint } from "@/lib/stats";
import { money } from "@/lib/format";

/**
 * Barras agrupadas en vez del área con relleno degradado que había antes.
 * Dos motivos: el degradado es puro adorno, y comparar "cuánto entró contra
 * cuánto salió" mes a mes se lee mucho mejor con dos barras lado a lado que
 * con dos áreas superpuestas y semitransparentes.
 *
 * Sin animación de entrada: es una pantalla de trabajo, no una presentación.
 * El dato tiene que estar completo apenas carga, y una barra que crece desde
 * cero es justo lo que rompe con `prefers-reduced-motion`.
 */
export function RevenueChart({
  data,
  alto = "h-72",
}: {
  data: MonthPoint[];
  /*
    Alto opcional. El valor por defecto es el de siempre, así que Reportes no
    cambia. El expediente del vehículo la pide más baja en teléfono, donde 288px
    se comen un tercio de la pantalla; es un ajuste de presentación y no toca ni
    los datos ni el cálculo.
  */
  alto?: string;
}) {
  return (
    <div className={`w-full ${alto}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--text-muted)", fontSize: 14 }}
            dy={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={72}
            tick={{ fill: "var(--text-muted)", fontSize: 14 }}
            tickFormatter={(value: number) => money(value, true)}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-hover)" }}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              boxShadow: "var(--shadow-pop)",
              fontSize: 15,
              color: "var(--text)",
            }}
            labelStyle={{ color: "var(--text)", fontWeight: 600 }}
            formatter={(value, name) => [money(Number(value ?? 0)), String(name)]}
          />
          <Legend
            verticalAlign="top"
            align="left"
            height={36}
            iconType="circle"
            formatter={(value) => (
              <span style={{ color: "var(--text)", fontSize: 15 }}>{value}</span>
            )}
          />
          <Bar
            dataKey="ingresos"
            name="Entró"
            fill="var(--tone-success-fg)"
            radius={[4, 4, 0, 0]}
            maxBarSize={38}
            isAnimationActive={false}
          />
          <Bar
            dataKey="gastos"
            name="Salió"
            fill="var(--tone-warning-fg)"
            radius={[4, 4, 0, 0]}
            maxBarSize={38}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
