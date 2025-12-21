import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Theme {
  id: string;
  emoji: string;
  title: string;
  description: string;
  decisionFilter: string;
  forWho: string;
}

const themes: Theme[] = [
  {
    id: "finish_what_i_start",
    emoji: "🏁",
    title: "Finish What I Start",
    description: "Complete existing projects before starting new ones",
    decisionFilter: "Does this help me complete existing projects?",
    forWho: "Serial starters who don't ship",
  },
  {
    id: "evidence_over_emotion",
    emoji: "📊",
    title: "Evidence Over Emotion",
    description: "Build tangible proof of your capabilities",
    decisionFilter: "Does this create tangible evidence?",
    forWho: "Those who feel capable but lack proof",
  },
  {
    id: "action_creates_clarity",
    emoji: "⚡",
    title: "Action Creates Clarity",
    description: "Act first, think second. Motion reveals the path",
    decisionFilter: "Can I act on this now instead of planning?",
    forWho: "Chronic over-thinkers",
  },
];

interface ThemeSelectorProps {
  yearlyPlanId: string | null;
  initialTheme?: string;
  onThemeSelect: (theme: string) => void;
}

export interface ThemeSelectorRef {
  saveTheme: () => Promise<boolean>;
  getSelectedTheme: () => string | null;
}

const ThemeSelector = forwardRef<ThemeSelectorRef, ThemeSelectorProps>(
  ({ yearlyPlanId, initialTheme, onThemeSelect }, ref) => {
    const [selectedTheme, setSelectedTheme] = useState<string | null>(initialTheme || null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      if (initialTheme) {
        setSelectedTheme(initialTheme);
      }
    }, [initialTheme]);

    const handleThemeSelect = async (themeId: string) => {
      setSelectedTheme(themeId);
      onThemeSelect(themeId);

      // Auto-save when theme is selected
      if (yearlyPlanId) {
        setSaving(true);
        try {
          const { error } = await supabase
            .from("yearly_plans")
            .update({
              theme: themeId,
              theme_created_at: new Date().toISOString(),
            })
            .eq("id", yearlyPlanId);

          if (error) throw error;
        } catch (error) {
          console.error("Error saving theme:", error);
          toast.error("Failed to save theme");
        } finally {
          setSaving(false);
        }
      }
    };

    useImperativeHandle(ref, () => ({
      saveTheme: async () => {
        if (!selectedTheme || !yearlyPlanId) return false;
        
        setSaving(true);
        try {
          const { error } = await supabase
            .from("yearly_plans")
            .update({
              theme: selectedTheme,
              theme_created_at: new Date().toISOString(),
            })
            .eq("id", yearlyPlanId);

          if (error) throw error;
          return true;
        } catch (error) {
          console.error("Error saving theme:", error);
          toast.error("Failed to save theme");
          return false;
        } finally {
          setSaving(false);
        }
      },
      getSelectedTheme: () => selectedTheme,
    }));

    const currentYear = new Date().getFullYear();
    const selectedThemeData = themes.find((t) => t.id === selectedTheme);

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Pick Your {currentYear} Theme
          </h2>
          <p className="text-muted-foreground text-lg">
            One focus to filter every decision this year
          </p>
        </div>

        {/* Theme Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {themes.map((theme) => {
            const isSelected = selectedTheme === theme.id;
            return (
              <Card
                key={theme.id}
                onClick={() => handleThemeSelect(theme.id)}
                className={cn(
                  "relative cursor-pointer transition-all duration-200 hover:scale-[1.02]",
                  "border-2",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50 hover:shadow-md"
                )}
              >
                {isSelected && (
                  <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
                <CardContent className="p-6 text-center space-y-4">
                  <div className="text-5xl">{theme.emoji}</div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">
                      {theme.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {theme.description}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground italic">
                      For: {theme.forWho}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Decision Filter Display */}
        {selectedThemeData && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6 text-center space-y-3">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                When making decisions, ask yourself:
              </p>
              <p className="text-xl md:text-2xl font-semibold text-foreground">
                "{selectedThemeData.decisionFilter}"
              </p>
              <p className="text-sm text-muted-foreground">
                This question will guide every choice you make this year.
              </p>
            </CardContent>
          </Card>
        )}

        {/* No selection hint */}
        {!selectedTheme && (
          <p className="text-center text-muted-foreground text-sm">
            Select a theme to continue
          </p>
        )}

        {/* Saving indicator */}
        {saving && (
          <p className="text-center text-muted-foreground text-sm animate-pulse">
            Saving...
          </p>
        )}
      </div>
    );
  }
);

ThemeSelector.displayName = "ThemeSelector";

export default ThemeSelector;
