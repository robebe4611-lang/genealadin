import { CHAPTERS } from "@/lib/presentation/chapters";
import { cn } from "@/lib/utils";

const STATES = ["חדשה", "היום", "נהג", "בדרך", "סופקה"] as const;
const SILOS = ["מחסן", "רכב", "רזרבה"] as const;
const MONEY = ["מזומן", "העברה", "חוב"] as const;

export function Schematic2D({ index }: { index: number }) {
  const id = CHAPTERS[index]?.id ?? "loop";
  return (
    <div className="relative flex h-full min-h-64 w-full items-center justify-center overflow-hidden bg-void">
      <svg
        viewBox="0 0 720 520"
        className="h-full w-full max-h-full"
        role="img"
        aria-label="תרשים מכונת היום"
      >
        <rect width="720" height="520" fill="#0e1419" />
        <circle cx="360" cy="268" r="188" fill="none" stroke="#2a3b4c" strokeWidth="1.2" />
        <circle
          cx="360"
          cy="268"
          r="188"
          fill="none"
          stroke="#c45c12"
          strokeWidth="2.4"
          strokeDasharray="18 12"
          className={cn(id === "loop" || id === "build" ? "opacity-100" : "opacity-25")}
        />

        {STATES.map((label, i) => {
          const a = -Math.PI / 2 + (i / STATES.length) * Math.PI * 2;
          const x = 360 + Math.cos(a) * 188;
          const y = 268 + Math.sin(a) * 188;
          const on = id === "order" || id === "loop";
          return (
            <g key={label}>
              <circle cx={x} cy={y} r={on ? 16 : 11} fill={on ? "#c45c12" : "#1c2a38"} />
              <text
                x={x}
                y={y + 36}
                textAnchor="middle"
                fill="#f4ece3"
                fontSize="13"
                fontFamily="Heebo, sans-serif"
              >
                {label}
              </text>
            </g>
          );
        })}

        <g className={id === "stock" ? "opacity-100" : "opacity-35"}>
          {SILOS.map((label, i) => {
            const x = 250 + i * 110;
            const h = id === "stock" ? [86, 52, 70][i] : 28;
            return (
              <g key={label}>
                <rect x={x} y={268 - 90} width="36" height="100" rx="6" fill="#1c2a38" />
                <rect
                  x={x + 6}
                  y={268 - 90 + (100 - h)}
                  width="24"
                  height={h}
                  rx="4"
                  fill={i === 2 ? "#c4923a" : i === 1 ? "#f08a2a" : "#3d8f6e"}
                />
                <text
                  x={x + 18}
                  y={296}
                  textAnchor="middle"
                  fill="#c9b9a6"
                  fontSize="12"
                  fontFamily="Heebo, sans-serif"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </g>

        <g className={id === "money" ? "opacity-100" : "opacity-30"}>
          {MONEY.map((label, i) => (
            <g key={label} transform={`translate(${292 + i * 68} 390)`}>
              <rect width="56" height="36" rx="8" fill="#1c2a38" />
              <text
                x="28"
                y="23"
                textAnchor="middle"
                fill="#f4ece3"
                fontSize="12"
                fontFamily="Heebo, sans-serif"
              >
                {label}
              </text>
            </g>
          ))}
        </g>

        <g className={id === "actors" || id === "route" ? "opacity-100" : "opacity-40"}>
          <rect x="86" y="210" width="70" height="52" rx="8" fill="#1c2a38" />
          <text x="121" y="241" textAnchor="middle" fill="#f4ece3" fontSize="13" fontFamily="Heebo, sans-serif">
            משרד
          </text>
          <rect x="318" y="118" width="84" height="40" rx="10" fill="#c45c12" />
          <text x="360" y="144" textAnchor="middle" fill="#f4ece3" fontSize="13" fontFamily="Heebo, sans-serif">
            נהג
          </text>
          <rect x="560" y="206" width="70" height="52" rx="8" fill="#1c2a38" />
          <text x="595" y="237" textAnchor="middle" fill="#f4ece3" fontSize="13" fontFamily="Heebo, sans-serif">
            בית
          </text>
        </g>

        <circle
          cx={id === "clock" ? 360 : 214}
          cy={id === "clock" ? 268 : 168}
          r="11"
          fill="#c45c12"
        />
      </svg>
    </div>
  );
}
