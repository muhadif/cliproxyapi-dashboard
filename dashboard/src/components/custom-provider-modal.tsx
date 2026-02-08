"use client";

import { useState, useEffect } from "react";
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

interface ModelMapping {
  upstreamName: string;
  alias: string;
}

interface CustomProvider {
  id: string;
  name: string;
  providerId: string;
  baseUrl: string;
  prefix: string | null;
  proxyUrl: string | null;
  headers: Record<string, string>;
  models: ModelMapping[];
  excludedModels: { pattern: string }[];
}

interface CustomProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider?: CustomProvider;
  onSuccess: () => void;
}

interface HeaderEntry {
  key: string;
  value: string;
}

function generateProviderId(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function CustomProviderModal({ isOpen, onClose, provider, onSuccess }: CustomProviderModalProps) {
  const { showToast } = useToast();
  const isEdit = !!provider;

  const [name, setName] = useState("");
  const [providerId, setProviderId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [prefix, setPrefix] = useState("");
  const [proxyUrl, setProxyUrl] = useState("");
  const [headers, setHeaders] = useState<HeaderEntry[]>([]);
  const [models, setModels] = useState<ModelMapping[]>([{ upstreamName: "", alias: "" }]);
  const [excludedModels, setExcludedModels] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [errors, setErrors] = useState({
    name: "",
    providerId: "",
    baseUrl: "",
    apiKey: "",
    models: ""
  });

  useEffect(() => {
    if (provider) {
      setName(provider.name);
      setProviderId(provider.providerId);
      setBaseUrl(provider.baseUrl);
      setPrefix(provider.prefix || "");
      setProxyUrl(provider.proxyUrl || "");
      setHeaders(Object.entries(provider.headers || {}).map(([key, value]) => ({ key, value })));
      setModels(provider.models.length > 0 ? provider.models : [{ upstreamName: "", alias: "" }]);
      setExcludedModels(provider.excludedModels.map(e => e.pattern));
      setApiKey("");
    } else {
      resetForm();
    }
  }, [provider, isOpen]);

  const resetForm = () => {
    setName("");
    setProviderId("");
    setBaseUrl("");
    setApiKey("");
    setPrefix("");
    setProxyUrl("");
    setHeaders([]);
    setModels([{ upstreamName: "", alias: "" }]);
    setExcludedModels([]);
    setErrors({ name: "", providerId: "", baseUrl: "", apiKey: "", models: "" });
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!isEdit) {
      setProviderId(generateProviderId(value));
    }
  };

  const validate = () => {
    const newErrors = {
      name: name.length === 0 ? "Name is required" : name.length > 100 ? "Max 100 characters" : "",
      providerId: !/^[a-z0-9-]+$/.test(providerId) ? "Only lowercase letters, numbers, and hyphens" : "",
      baseUrl: !baseUrl.startsWith("https://") ? "Must start with https://" : "",
      apiKey: !isEdit && apiKey.length === 0 ? "API key is required" : "",
      models: models.filter(m => m.upstreamName && m.alias).length === 0 ? "At least one model mapping required" : ""
    };

    setErrors(newErrors);
    return Object.values(newErrors).every(e => e === "");
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);

    const validModels = models.filter(m => m.upstreamName && m.alias);
    const headersObj = headers.reduce((acc, h) => {
      if (h.key && h.value) acc[h.key] = h.value;
      return acc;
    }, {} as Record<string, string>);

    const payload = {
      name,
      providerId,
      baseUrl,
      ...(apiKey ? { apiKey } : {}),
      prefix: prefix || undefined,
      proxyUrl: proxyUrl || undefined,
      headers: Object.keys(headersObj).length > 0 ? headersObj : undefined,
      models: validModels,
      excludedModels: excludedModels.filter(e => e.trim())
    };

    try {
      const url = isEdit ? `/api/custom-providers/${provider.id}` : "/api/custom-providers";
      const method = isEdit ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showToast(`Custom provider ${isEdit ? 'updated' : 'created'}`, "success");
        onSuccess();
        onClose();
        resetForm();
      } else {
        const error = await response.json();
        showToast(error.error || "Failed to save provider", "error");
      }
    } catch (error) {
      console.error("Save provider error:", error);
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  const addModelMapping = () => {
    setModels([...models, { upstreamName: "", alias: "" }]);
  };

  const removeModelMapping = (index: number) => {
    setModels(models.filter((_, i) => i !== index));
  };

  const updateModelMapping = (index: number, field: keyof ModelMapping, value: string) => {
    const updated = [...models];
    updated[index][field] = value;
    setModels(updated);
  };

  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "" }]);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const updateHeader = (index: number, field: keyof HeaderEntry, value: string) => {
    const updated = [...headers];
    updated[index][field] = value;
    setHeaders(updated);
  };

  const addExcludedModel = () => {
    setExcludedModels([...excludedModels, ""]);
  };

  const removeExcludedModel = (index: number) => {
    setExcludedModels(excludedModels.filter((_, i) => i !== index));
  };

  const updateExcludedModel = (index: number, value: string) => {
    const updated = [...excludedModels];
    updated[index] = value;
    setExcludedModels(updated);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl">
      <ModalHeader>
        <ModalTitle>{isEdit ? 'Edit' : 'Add'} Custom Provider</ModalTitle>
      </ModalHeader>

      <ModalContent>
        <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-2">
          {/* Name */}
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-semibold text-white">
              Name <span className="text-red-400">*</span>
            </label>
            <Input
              type="text"
              name="name"
              value={name}
              onChange={handleNameChange}
              placeholder="My Custom Provider"
              required
              disabled={saving}
            />
            {errors.name && <p className="mt-1.5 text-xs text-red-400">{errors.name}</p>}
          </div>

          {/* Provider ID */}
          <div>
            <label htmlFor="providerId" className="mb-2 block text-sm font-semibold text-white">
              Provider ID <span className="text-red-400">*</span>
            </label>
            <Input
              type="text"
              name="providerId"
              value={providerId}
              onChange={setProviderId}
              placeholder="my-custom-provider"
              required
              disabled={saving || isEdit}
              className={isEdit ? "opacity-60 cursor-not-allowed" : ""}
            />
            {errors.providerId && <p className="mt-1.5 text-xs text-red-400">{errors.providerId}</p>}
            {!errors.providerId && <p className="mt-1.5 text-xs text-white/50">Lowercase alphanumeric with hyphens. {isEdit ? "Cannot be changed." : "Auto-generated from name."}</p>}
          </div>

          {/* Base URL */}
          <div>
            <label htmlFor="baseUrl" className="mb-2 block text-sm font-semibold text-white">
              Base URL <span className="text-red-400">*</span>
            </label>
            <Input
              type="text"
              name="baseUrl"
              value={baseUrl}
              onChange={setBaseUrl}
              placeholder="https://api.example.com/v1"
              required
              disabled={saving}
            />
            {errors.baseUrl && <p className="mt-1.5 text-xs text-red-400">{errors.baseUrl}</p>}
          </div>

          {/* API Key */}
          <div>
            <label htmlFor="apiKey" className="mb-2 block text-sm font-semibold text-white">
              API Key {!isEdit && <span className="text-red-400">*</span>}
            </label>
            <Input
              type="password"
              name="apiKey"
              value={apiKey}
              onChange={setApiKey}
              placeholder={isEdit ? "Leave empty to keep existing key" : "sk-..."}
              required={!isEdit}
              disabled={saving}
            />
            {errors.apiKey && <p className="mt-1.5 text-xs text-red-400">{errors.apiKey}</p>}
            {!errors.apiKey && isEdit && <p className="mt-1.5 text-xs text-white/50">Leave empty to keep existing API key</p>}
          </div>

          {/* Prefix */}
          <div>
            <label htmlFor="prefix" className="mb-2 block text-sm font-semibold text-white">
              Prefix (Optional)
            </label>
            <Input
              type="text"
              name="prefix"
              value={prefix}
              onChange={setPrefix}
              placeholder="custom/"
              disabled={saving}
            />
            <p className="mt-1.5 text-xs text-white/50">Model name prefix for routing</p>
          </div>

          {/* Proxy URL */}
          <div>
            <label htmlFor="proxyUrl" className="mb-2 block text-sm font-semibold text-white">
              Proxy URL (Optional)
            </label>
            <Input
              type="text"
              name="proxyUrl"
              value={proxyUrl}
              onChange={setProxyUrl}
              placeholder="http://proxy.example.com:8080"
              disabled={saving}
            />
          </div>

          {/* Headers */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="headers" className="text-sm font-semibold text-white">Headers (Optional)</label>
              <Button variant="ghost" onClick={addHeader} className="px-3 py-1.5 text-xs" disabled={saving}>
                + Add Header
              </Button>
            </div>
            {headers.length > 0 && (
              <div className="space-y-2">
                {headers.map((header, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      type="text"
                      name={`header-key-${idx}`}
                      value={header.key}
                      onChange={(val) => updateHeader(idx, 'key', val)}
                      placeholder="Header-Name"
                      disabled={saving}
                      className="flex-1"
                    />
                    <Input
                      type="text"
                      name={`header-value-${idx}`}
                      value={header.value}
                      onChange={(val) => updateHeader(idx, 'value', val)}
                      placeholder="Header-Value"
                      disabled={saving}
                      className="flex-1"
                    />
                    <Button variant="danger" onClick={() => removeHeader(idx)} className="px-3 shrink-0" disabled={saving}>
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Model Mappings */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="models" className="text-sm font-semibold text-white">
                Model Mappings <span className="text-red-400">*</span>
              </label>
              <Button variant="ghost" onClick={addModelMapping} className="px-3 py-1.5 text-xs" disabled={saving}>
                + Add Model
              </Button>
            </div>
            <div className="space-y-2">
              {models.map((model, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    type="text"
                    name={`model-upstream-${idx}`}
                    value={model.upstreamName}
                    onChange={(val) => updateModelMapping(idx, 'upstreamName', val)}
                    placeholder="gpt-4"
                    disabled={saving}
                    className="flex-1"
                  />
                  <Input
                    type="text"
                    name={`model-alias-${idx}`}
                    value={model.alias}
                    onChange={(val) => updateModelMapping(idx, 'alias', val)}
                    placeholder="custom-gpt-4"
                    disabled={saving}
                    className="flex-1"
                  />
                  {models.length > 1 && (
                    <Button variant="danger" onClick={() => removeModelMapping(idx)} className="px-3 shrink-0" disabled={saving}>
                      ✕
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {errors.models && <p className="mt-1.5 text-xs text-red-400">{errors.models}</p>}
            {!errors.models && <p className="mt-1.5 text-xs text-white/50">Map upstream model names to aliases</p>}
          </div>

          {/* Excluded Models */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="excludedModels" className="text-sm font-semibold text-white">Excluded Models (Optional)</label>
              <Button variant="ghost" onClick={addExcludedModel} className="px-3 py-1.5 text-xs" disabled={saving}>
                + Add Exclusion
              </Button>
            </div>
            {excludedModels.length > 0 && (
              <div className="space-y-2">
                {excludedModels.map((pattern, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      type="text"
                      name={`excluded-${idx}`}
                      value={pattern}
                      onChange={(val) => updateExcludedModel(idx, val)}
                      placeholder="gpt-4-* or specific-model"
                      disabled={saving}
                      className="flex-1"
                    />
                    <Button variant="danger" onClick={() => removeExcludedModel(idx)} className="px-3 shrink-0" disabled={saving}>
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {excludedModels.length === 0 && (
              <p className="text-xs text-white/50">Supports wildcards: gpt-4, claude-*, *-mini</p>
            )}
          </div>
        </div>
      </ModalContent>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? (isEdit ? "Updating..." : "Creating...") : (isEdit ? "Update Provider" : "Create Provider")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
