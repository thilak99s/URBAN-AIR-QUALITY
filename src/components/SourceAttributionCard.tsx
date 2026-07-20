import { AlertTriangle, ShieldCheck } from "lucide-react";
import { SourceAttribution } from "../types.js";

interface SourceAttributionCardProps {
  attribution: SourceAttribution | null;
}

export default function SourceAttributionCard({ attribution }: SourceAttributionCardProps) {
  if (!attribution) {
    return (
      <div className="bg-brand-panel rounded border border-brand-border p-5 h-full flex items-center justify-center text-xs text-brand-muted font-medium">
        Select a ward to view probable pollution source attributions.
      </div>
    );
  }

  const sources = [
    { name: "Traffic", value: attribution.trafficContribution, color: "bg-brand-accent", label: "Tailpipe emissions & stop-and-go idling" },
    { name: "Construction", value: attribution.constructionContribution, color: "bg-brand-accent/60", label: "Demolition & unmitigated fugitive dust" },
    { name: "Industry", value: attribution.industryContribution, color: "bg-brand-warning", label: "Boiler stacks & industrial point sources" },
    { name: "Waste Burning", value: attribution.wasteBurningContribution, color: "bg-brand-danger", label: "Open air garbage & dried foliage incineration" },
    { name: "Road Dust", value: attribution.roadDustContribution, color: "bg-brand-success", label: "Mechanical suspension on paved corridors" }
  ].sort((a,b) => b.value - a.value);

  const getConfidenceLevel = (score: number) => {
    if (score >= 85) return { text: "High", color: "text-brand-success bg-brand-success/10 border-brand-success/30" };
    if (score >= 65) return { text: "Medium", color: "text-brand-accent bg-brand-accent/10 border-brand-accent/30" };
    return { text: "Low (Limited Inputs)", color: "text-brand-danger bg-brand-danger/10 border-brand-danger/30" };
  };

  const confidence = getConfidenceLevel(attribution.confidenceScore);

  return (
    <div className="bg-brand-panel rounded border border-brand-border p-4 flex flex-col gap-4 h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-2 border-b border-brand-border pb-3">
        <div>
          <h3 className="font-bold text-brand-text text-sm">Probabilistic Attribution</h3>
          <p className="text-[10px] text-brand-muted font-medium mt-0.5">Estimated contribution using multimodal geospatial features</p>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold ${confidence.color}`}>
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>CONFIDENCE: {attribution.confidenceScore}%</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {sources.map((src, index) => (
          <div key={src.name} className="flex flex-col gap-1.5">
            <div className="flex justify-between items-end text-xs font-semibold">
              <div className="flex flex-col">
                <span className="text-brand-text flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${src.color}`}></span>
                  {src.name} {index === 0 && <span className="text-[9px] bg-brand-accent/15 text-brand-accent border border-brand-accent/30 px-1.5 rounded font-bold uppercase tracking-wider">Dominant</span>}
                </span>
                <span className="text-[10px] text-brand-muted font-medium ml-3.5">{src.label}</span>
              </div>
              <span className="text-brand-text font-mono text-sm">{src.value}%</span>
            </div>
            <div className="w-full bg-brand-bg h-2 rounded overflow-hidden border border-brand-border/30">
              <div className={`${src.color} h-full rounded transition-all duration-500`} style={{ width: `${src.value}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto border-t border-brand-border pt-3 flex flex-col gap-2.5">
        <div className="flex gap-2 p-2.5 bg-brand-accent/10 rounded border border-brand-accent/20 text-[10px] text-brand-text leading-relaxed font-medium">
          <ShieldCheck className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" />
          <p>
            <strong>Technical Accuracy:</strong> {attribution.dominantSource} is the probable dominant contributing source in this ward based on available multimodal environmental indicators, weather variables, and local activity densities.
          </p>
        </div>
        <div className="flex gap-2 p-2.5 bg-brand-bg/50 rounded border border-brand-border text-[10px] text-brand-muted leading-relaxed font-medium">
          <AlertTriangle className="w-4 h-4 text-brand-muted flex-shrink-0 mt-0.5" />
          <p>
            <strong>Methodology Disclaimer:</strong> This represents a probabilistic pollution source attribution based on statistical models and environmental indicators. It does not identify the exact emission point-sources.
          </p>
        </div>
      </div>
    </div>
  );
}
