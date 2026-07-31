import React, { useState } from "react";
import { Card, Button, Input, PageHeader, Alert } from "../../../app/components/ui";
import { getAwardSettings, saveAwardSettings } from "../../../store";
import type { AwardSetting } from "../../../types";

export function AwardSettingsManager() {
  const [settings, setSettings] = useState<AwardSetting[]>(getAwardSettings());
  const [toast, setToast] = useState<string | null>(null);

  const handleChange = (id: string, field: "minimum_average" | "minimum_subject_grade", val: number) => {
    setSettings((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: val } : s)));
  };

  const handleSave = () => {
    saveAwardSettings(settings);
    setToast("Award settings saved successfully!");
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div>
      <PageHeader title="Academic Award Settings" subtitle="Configure General Average and minimum subject grade criteria for academic medals." />

      {toast && <Alert variant="success" className="mb-4">{toast}</Alert>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {settings.map((s) => (
          <Card key={s.id} className="p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">{s.award_name}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Minimum General Average</label>
                <Input
                  type="number"
                  step="0.1"
                  value={s.minimum_average}
                  onChange={(e) => handleChange(s.id, "minimum_average", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Minimum Subject Grade</label>
                <Input
                  type="number"
                  step="0.1"
                  value={s.minimum_subject_grade}
                  onChange={(e) => handleChange(s.id, "minimum_subject_grade", parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="bg-[#800000] text-white font-bold px-6">
          Save Settings
        </Button>
      </div>
    </div>
  );
}
