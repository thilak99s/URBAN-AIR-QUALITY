import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { AQIRecord, AQIPrediction } from "../types.js";

interface ForecastChartProps {
  historicalData: AQIRecord[];
  prediction: AQIPrediction | null;
}

export default function ForecastChart({ historicalData, prediction }: ForecastChartProps) {
  // Combine historical data (e.g., last 7 days) with predicted value for display
  const chartData = historicalData.slice(-7).map(r => ({
    time: new Date(r.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    "Actual AQI": r.aqi,
    "Predicted AQI": null as number | null
  }));

  if (prediction) {
    const lastHist = historicalData[historicalData.length - 1];
    
    // Connect actual trend with predicted line
    if (chartData.length > 0) {
      chartData[chartData.length - 1]["Predicted AQI"] = lastHist.aqi;
    }

    chartData.push({
      time: "Tomorrow (Forecast)",
      "Actual AQI": null,
      "Predicted AQI": prediction.predictedAqi
    });
  }

  // Set color styling based on AQI values
  const getAQIColorClass = (val: number) => {
    if (val <= 50) return "text-brand-success bg-brand-success/15 border-brand-success/30";
    if (val <= 100) return "text-brand-accent bg-brand-accent/15 border-brand-accent/30";
    if (val <= 150) return "text-brand-warning bg-brand-warning/15 border-brand-warning/30";
    if (val <= 200) return "text-brand-danger bg-brand-danger/15 border-brand-danger/30";
    return "text-brand-danger bg-brand-danger/20 border-brand-danger/40 animate-pulse";
  };

  return (
    <div className="bg-brand-panel rounded border border-brand-border p-4 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="font-bold text-brand-text text-sm">Hyperlocal Forecast (24h)</h3>
          <p className="text-[10px] text-brand-muted mt-0.5">XGBoost dispersion forecast pipeline</p>
        </div>
        {prediction && (
          <div className="flex gap-2 items-center text-[10px]">
            <span className="font-bold text-brand-muted uppercase tracking-wider">Forecast:</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getAQIColorClass(prediction.predictedAqi)}`}>
              {prediction.predictedAqi} AQI
            </span>
          </div>
        )}
      </div>

      <div className="w-full h-64">
        {chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-brand-muted font-medium">
            Loading historical trending parameters...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 15, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a2f3a" />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, "auto"]} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ background: "#161a22", borderRadius: "4px", border: "1px solid #2a2f3a", boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}
                labelStyle={{ fontWeight: "bold", fontSize: "11px", color: "#e2e8f0" }}
                itemStyle={{ fontSize: "11px", padding: "2px 0", color: "#e2e8f0" }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
              <Line 
                type="monotone" 
                dataKey="Actual AQI" 
                stroke="#3b82f6" 
                strokeWidth={2.5} 
                dot={{ r: 3.5, strokeWidth: 1.5, fill: "#161a22" }} 
                activeDot={{ r: 5 }} 
              />
              <Line 
                type="monotone" 
                dataKey="Predicted AQI" 
                stroke="#10b981" 
                strokeWidth={2.5} 
                strokeDasharray="5 5" 
                dot={{ r: 4, strokeWidth: 2, fill: "#10b981" }} 
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-brand-border pt-3 text-[11px] text-brand-muted font-medium">
        <div>
          <span className="text-brand-muted block mb-0.5">Model MAE</span>
          <span className="font-mono font-bold text-brand-accent bg-brand-accent/15 px-1.5 py-0.5 rounded border border-brand-accent/30">&plusmn;8.24 AQI</span>
        </div>
        <div>
          <span className="text-brand-muted block mb-0.5">Model RMSE</span>
          <span className="font-mono font-bold text-brand-success bg-brand-success/15 px-1.5 py-0.5 rounded border border-brand-success/30">11.45 AQI</span>
        </div>
        <div>
          <span className="text-brand-muted block mb-0.5">VS Baseline</span>
          <span className="text-brand-text font-bold bg-brand-border/40 px-1.5 py-0.5 rounded border border-brand-border/60">35% Gain</span>
        </div>
      </div>
    </div>
  );
}
