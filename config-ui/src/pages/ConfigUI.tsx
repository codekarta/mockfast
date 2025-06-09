import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ConfigUI() {
  const [delayEnabled, setDelayEnabled] = useState(false);
  const [delayMs, setDelayMs] = useState("0");

  const [useHttps, setUseHttps] = useState(false);
  const [useSelfSigned, setUseSelfSigned] = useState(true);

  const [certPaths, setCertPaths] = useState({
    keyFile: "",
    certFile: ""
  });

  const updateCertPath = (field: string, value: string) => {
    setCertPaths(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const config = {
      delayEnabled,
      delayMs: parseInt(delayMs),
      useHttps,
      useSelfSigned,
      ...certPaths
    };

    await fetch("/apply-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });
  };

  return (
    <div className="max-w-xl mx-auto mt-10 space-y-6">
      <div className="space-y-2">
        <label className="flex items-center space-x-2">
          <Switch checked={delayEnabled} onCheckedChange={setDelayEnabled} />
          <span>Enable Delay</span>
        </label>
        {delayEnabled && (
          <Input
            placeholder="Delay in ms"
            value={delayMs}
            onChange={e => setDelayMs(e.target.value)}
          />
        )}
      </div>

      <div className="space-y-2">
        <label className="flex items-center space-x-2">
          <Switch checked={useHttps} onCheckedChange={setUseHttps} />
          <span>Use HTTPS</span>
        </label>

        {useHttps && (
          <div className="space-y-2 ml-4">
            <label className="flex items-center space-x-2">
              <Switch
                checked={useSelfSigned}
                onCheckedChange={setUseSelfSigned}
              />
              <span>Use Self-Signed Cert</span>
            </label>

            {!useSelfSigned && (
              <div className="space-y-2">
                <Input
                  placeholder="Key File"
                  value={certPaths.keyFile}
                  onChange={e => updateCertPath("keyFile", e.target.value)}
                />
                <Input
                  placeholder="Cert File"
                  value={certPaths.certFile}
                  onChange={e => updateCertPath("certFile", e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <Button className="w-full" onClick={handleSave}>
        Save & Restart
      </Button>
    </div>
  );
}
